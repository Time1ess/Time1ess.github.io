---
title: Python属性访问
date: 2017-02-04 16:26:07
tags: [Python,描述器,属性]
categories: Python
from: https://docs.python.org/2/howto/descriptor.html
---
在上一篇中讲到了描述器方法`__get__`、`__set__`和`__delete__`，同时也提到，一个对象具有任意一个方法的就会成为描述器，从而在被当作对象属性的时候会重写默认的查找行为。在本篇中，通过对[Descriptor HowTo Guide](https://docs.python.org/2/howto/descriptor.html)的节选翻译以及笔者的自身的一些实践，对描述器做一个更详细的说明。

如果一个对象同时定义了`__get__`和`__set__`方法，则称它为资料描述器(*data descriptor*)，而仅定义了`__get__`方法的描述器称为非资料描述器(*non-data descriptor*，常用于方法，其他用途也是可以的)。

资料描述器和非资料描述器的区别在于：**相对于实例的字典的优先级**。如果实例字典中有和描述器重名的属性，如果描述器是资料描述器，优先使用资料描述器，如果是非资料描述器，优先使用字典中的属性。这就是为何实例a的方法和属性重名时，比如都叫做`foo`，Python会在访问`a.foo`时优先访问实例字典中的属性，因为实例的方法是个非资料描述器。
<!-- more -->
要想制作一个只读的资料描述器需要同时定义`__set__`和`__get__`方法，由于是只读，所以只需要在`__set__`方法中抛出一个`AttributeError`异常即可。

在一般情况下，描述器在属性访问时被自动调用。举例来说，`obj.d`会在`obj`的字典里面查找`d`，如果`d`定义了`__get__`方法，那么`d.__get__(obj)`会依据下面的优先规则被调用。

调用的细节取决于`obj`是一个类还是一个实例，对于对象来讲，方法`object.__getattribute__`将属性访问`a.x`变成了`type(a).__dict__['x'].__get__(a, type(a))`，具体实现依据这样的优先顺序:**资料描述器**优先于**实例变量**，**实例变量**优先于**非资料描述器**，`__getattr__()`方法具有最低优先级；对于类来讲，方法`type.__getattribute__`将`A.x`变成`A.__dict__['x'].__get__(None, A)`。如以下代码:
```Python
class V:
    v = 0
    
    def __init__(self, val=0):
        self.v = val
    
    def __get__(self, inst, owner):
        return self.v
        
    def __set__(self, inst, value):
        self.v = value
        
        
class A:
    k1 = V(1)
    def k(self):  # non-data descriptor
        pass

a = A()
print(a.k)  # <bound method...> *op1*
a.k = 6  # replace non-data descriptor with instance dict  *op2*
print(a.k)  # 6  *op3*

print(a.k1)  # 1
a.__dict__['k1'] = V(2)  # *op4*
print(a.k1)  # 1
```
这段代码展示了资料描述器、实例变量、非资料描述器在属性访问中的不同优先级，分析如下:类`A`中定义了方法`k`(非资料描述器)，第一次操作对`a.k`的访问将转变为`type(a).__dict__['k'].__get__(a, type(a))`，`type(a)`即类`A`，`A.__dict__`中存储了方法`A.k`，由于方法`A.k`为非资料描述器，因此调用其定义的`__get__()`方法。第二次操作`a.k = 6`本质上是在字典`a.__dict__`中添加了`k`这一变量(注意`a.__dict__`和`A._dict__`的区别)，即新增了实例变量。第三次操作对`a.k`的访问由于**实例变量**优先级高于**非资料描述器**，因此将获得之前的赋值6而不是方法。在第四次操作前后分别访问了`a.k1`属性，由于`k1`是资料描述器，因此即使在`a.__dict__`中新增了实例变量`k1`，对`a.k1`仍然是访问了资料描述器而不是实例变量，与前述的优先级保持一致。

`__getattr__`与`__getattribute__`区别:前者只会在待访问的属性缺失时触发，而后者则会在每次访问属性时触发。

**特别注意:**如果要在`__getattribute__`和`__setattr__`方法中访问实例属性，那么应该直接通过`super()`来做，以避免无限递归。如以下代码就会抛出异常:
```Python
class BrokenAttribute:
    def __init__(self, data):
        self._data = data
    
    def __getattribute__(self, name):
        print('Called __getattribute__({0})'.format(name))
        return self._data[name]


data = BrokenAttribute({'foo': 3})
print(data.foo)
>>>
RecursionError: maximum recursion depth exceeded while calling a Python object
```

#### 属性Property

调用`property()`是建立资料描述器的一种简洁方式，从而可以在访问属性时触发相应的方法调用。`property`函数原型:
```
property(fget=None, fset=None, fdel=None, doc=None) -> property attribute
```

下面展示了一个典型应用，定义一个托管属性(managed attribute)x:

```Python
class C(object):
    def getx(self): return self.__x
    def setx(self, value): self.__x = value
    def delx(self): del self.__x
    x = property(getx, setx, delx, "I'm the 'x' property.")
```

其等价Python实现为:

```Python
class Property(object):
    "Emulate PyProperty_Type() in Objects/descrobject.c"

    def __init__(self, fget=None, fset=None, fdel=None, doc=None):
        self.fget = fget
        self.fset = fset
        self.fdel = fdel
        self.__doc__ = doc

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        if self.fget is None:
            raise AttributeError, "unreadable attribute"
        return self.fget(obj)

    def __set__(self, obj, value):
        if self.fset is None:
            raise AttributeError, "can't set attribute"
        self.fset(obj, value)

    def __delete__(self, obj):
        if self.fdel is None:
            raise AttributeError, "can't delete attribute"
        self.fdel(obj)
```

#### 静态方法与类方法

非资料描述器为将函数绑定成方法这种常见模式提供了一个简单的实现机制。
简而言之，函数有个方法`__get__()`，当函数被当作属性访问时，它会把函数变成一个实例方法。非资料描述器把实例调用`obj.f(*args)`转换成`f(obj, *args)`(绑定方法)，把类调用`klass.f(*args)`转换成`f(klass, *args)`(非绑定方法)。
静态方法原样返回函数，调用 c.f 或者 C.f 分别等价于`object.__getattribute__(c, "f")`或者`object.__getattribute__(C, "f")`。也就是说，无论是从一个对象还是一个类中，这个函数都会同样地访问到。
利用非资料描述器，`staticmethod()`的等价实现看起来像这样:

```Python
class staticmethod(object):
 "Emulate PyStaticMethod_Type() in Objects/funcobject.c"

 def __init__(self, f):
      self.f = f

 def __get__(self, obj, objtype=None):
      return self.f
```

同样的，`classmethod()`等价实现看起来像这样:

```Python
class ClassMethod(object):
     "Emulate PyClassMethod_Type() in Objects/funcobject.c"

     def __init__(self, f):
          self.f = f

     def __get__(self, obj, klass=None):
          if klass is None:
               klass = type(obj)
          def newfunc(*args):
               return self.f(klass, *args)
          return newfunc
```




