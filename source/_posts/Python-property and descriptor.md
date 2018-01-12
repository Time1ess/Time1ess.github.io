---
title: Python属性与描述器
date: 2017-01-24 17:03:27
tags: [Python,属性,描述器]
categories: Python
---
#### `getter`与`setter`
如果开发者之前有其他语言的开发经验，在转入Python之后，可能会在类中明确地实现类似`getter`和`setter`方法，如:
```Python
class OldResistor:
    def __init__(self, ohms):
        self._ohms = ohms
    
    def get_ohms(self):
        return self._homs
    
    def set_ohms(self, ohms):
        self._ohms = ohms
```
<!-- more-->
然而这种方法却并不像Python的编程风格，特别是对于自增的代码来说更是如此:
```Python
r = OldResistor(1e3)
r.set_ohms(r.get_ohms()+1e3)
```

对于Python语言来说，基本上不需要手工实现`getter`和`setter`方法，而是该先从简单的`public`属性写起:
```Python
class NewResistor:
    def __init__(self, ohms):
        self.ohms = ohms
        
r = NewResistor(1e3)
r.ohms += 1e3
```

但是开发者可能需要在对某个属性操作的时候实现特殊行为，这时候可以改用`@property`修饰器和`setter`方法来做:
```Python
class PropResistor:
    def __init__(self, ohms):
        self._ohms = ohms
    
    @property
    def ohms(self):
        # Do what you want when access ohms
        return self._ohms
    
    @ohms.setter
    def ohms(self, ohms):
        # Do what you want when change ohms
        self._ohms = ohms
```

通过指定`setter`方法，我们可以在方法里面做类型验证以及数值验证。

但是,考虑下面一种情况:
> 假设有一个考试成绩(`Exam`)类，由多个科目的小成绩组成，每一科需要单独计分，在进行分数录入的时候，要求对成绩进行验证，保证其在0~100之间

如果使用属性`@property`实现，每添加一项科目，就要重复编写一次`@property`方法，而且还需要重复相关验证逻辑，如:
```Python
class Exam:
    def __init__(self):
       self._chinese_grade = 0
       self._math_grade = 0
       
    @staticmethod
    def _check_grade(value):
    if not (0 <= value <= 100):
        raise ValueError('Grade must be between 0 and 100')
    
    @property
    def chinese_grade(self):
        return self._chinese_grade
    
    @chinese_grade.setter
    def chinese_grade(self, grade):
        self._check_grade(grade)
        self._chinese_grade = grade
        
    @property
    def math_grade(self):
        return self._math_grade
        
    @math_grade.setter
    def math_grade(self, grade):
        self._check_grade(grade)
        self._math_grade = grade
```

实际上，有另外一种更好的方式实现上述功能，那就是采用Python的描述器(*descriptor*)来做。

#### 描述器
> 一般来说，一个描述器是一个有“绑定行为”的对象属性(object attribute)，它的访问控制被描述器协议方法重写。这些方法是 `__get__()`, `__set__()`, 和 `__delete__()` 。有这些方法的对象叫做描述器。

```Python
descr.__get__(self, obj, type=None) --> value
descr.__set__(self, obj, value) --> None
descr.__delete__(self, obj) --> None
```
以上是所有描述器方法。一个对象具有其中任一个方法就会成为描述器，从而在被当作对象属性时重写默认的查找行为。来看一个例子:
```Python
class Grade:
    def __init__(self):
        self._value = 0
        
    def __get__(self, inst, owner):
        return self._value
    
    def __set__(self, inst, value):
        if not (0 <= value <= 100):
            raise ValueError('Grade must be between 0 and 100')
        self._value = value

class Exam:
    math_grade = Grade()
```
为属性赋值时:
```Python
exam = Exam()
exam.math_grade = 50
```

Python会对赋值操作进行转译，`exam.math_grade = 50`将会被转译成:
```Python
Exam.__dict__['math_grade'].__set__(exam, 40)
```

同样，访问操作也会被转译，`print(exam.math_grade)`将会被转译成:
```Python
print(Exam.__dict__['math_grade'].__get__(exam, Exam))
```

但是，上面的代码存在一个问题，由于所有类`Exam`的实例都会共享同一份`math_grade`实例，即程序定义类`Exam`的时候，就会把类`Grade`的`math_grade`实例构建好，以后再创建类`Exam`的实例时，就不再构建Grade了，因此我们需要把每个`Exam`实例所对应的值记录到`Grade`中，因此可以采取字典保存:
```Python
class Grade:
    def __init__(self):
        self._values = {}
        
    def __get__(self, inst, owner):
        if inst is None:
            return self
        return self._values.get(inst, 0)
    
    def __set__(self, inst, value):
        if not (0 <= value <= 100):
            raise ValueError('Grade must be between 0 and 100')
        self._values[inst] = value
```

这种方式实现简单，而且能够正常运作，但它仍然有一个问题，就是内存泄漏，在程序生命周期类，对于传给`__set__`方法的每个`Exam`实例来说，`_values`字典都会保存一份指向该实例的引用，这就导致该实例的引用计数无法降为0，从而使垃圾收集器无法将其回收，通过使用Python内置的`weakref`模块即可解决此问题。该模块提供了名为`WeakKeyDictionary`的特殊字典，该字典的引用为弱引用，系统能够正确的完成回收:
```Python
class Grade:
    def __init__(self):
        self._values = WeakKeyDictionary()
    # ...
```