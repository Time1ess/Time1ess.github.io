---
title: Python中的metaclass(元类)
date: 2017-02-06 16:11:02
tags: [Python,类,面向对象编程]
categories: Python
from: http://stackoverflow.com/questions/100003/what-is-a-metaclass-in-python?answertab=votes#tab-top
---
本文根据对[StackOverflow](http://stackoverflow.com)上问题[What is a metaclass in Python?](http://stackoverflow.com/questions/100003/what-is-a-metaclass-in-python?answertab=votes#tab-top)的高票回答翻译结合实际例子，试图解释**元类**的意义与用途。

#### 类也是对象

在想了解什么是**元类**之前，需要读者掌握Python中类的基本概念。而恰巧Python对类的定义有着不同于其他语言的解释。在大多数编程语言中，类仅仅只是指示如何生成实例对象的一段代码，这一点在Python中也如此:

<!-- more -->
```Python
>>> class ObjectCreator(object):
...       pass
... 

>>> my_object = ObjectCreator()
>>> print(my_object)
<__main__.ObjectCreator object at 0x8974f2c>
```

但是，Python中的类还远不止如此:

<div class="tip">
类也是实例对象
</div>

当程序员使用了关键字`class`时，Python将会执行它并且创建一个对象:

```Python
>>> class ObjectCreator(object):
...       pass
... 
```

上述代码将会在内存中创建一个名叫"ObjectCreator"的对象。

<div class="tip">
这个对象(类)自身拥有创建对象(实例)的能力，因此被称作类
</div>

即便如此，它仍然是一个对象，因此:
* 你可以将它赋值给一个变量
* 你可以复制它
* 你可以为它添加属性
* 你可以将它作为函数参数传递

例如,
使用`print`打印:

```Python
>>> print(ObjectCreator) # you can print a class because it's an object
<class '__main__.ObjectCreator'>
```
作为函数参数传递:

```Python
>>> def echo(o):
...       print(o)
... 
>>> echo(ObjectCreator) # you can pass a class as a parameter
<class '__main__.ObjectCreator'>
```
添加属性:

```Python
>>> print(hasattr(ObjectCreator, 'new_attribute'))
False
>>> ObjectCreator.new_attribute = 'foo' # you can add attributes to a class
>>> print(hasattr(ObjectCreator, 'new_attribute'))
True
>>> print(ObjectCreator.new_attribute)
foo
```
赋值给另一个变量:

```Python
>>> ObjectCreatorMirror = ObjectCreator # you can assign a class to a variable
>>> print(ObjectCreatorMirror.new_attribute)
foo
>>> print(ObjectCreatorMirror())
<__main__.ObjectCreator object at 0x8997b4c>
```

#### 动态地创建类
既然类也是对象，那么你可以向创建对象一样快速地创建它们。
首先，你可以通过使用关键字`class`在函数中创建一个类:

```Python
>>> def choose_class(name):
...     if name == 'foo':
...         class Foo(object):
...             pass
...         return Foo # return the class, not an instance
...     else:
...         class Bar(object):
...             pass
...         return Bar
...     
>>> MyClass = choose_class('foo') 
>>> print(MyClass, MyClass()) # the function returns a class, not an instance
<class '__main__.choose_class.<locals>.Foo'> <__main__.choose_class.<locals>.Foo object at 0x10a7d06a0>
```

但它并不是很动态，因为你仍然需要亲自编写整个类。由于类是对象，那么它们必然是被某些东西生成的。当你使用关键字`class`时，Python自动地创建了其对象的对象。但就跟Python中大多数东西一样，Python给了你手动操作它的方法。
还记得函数`type`吗？这个函数能够让你知道一个对象的类型:

```Python
>>> print(type(1))
<type 'int'>
>>> print(type("1"))
<type 'str'>
>>> print(type(ObjectCreator))
<type 'type'>
>>> print(type(ObjectCreator()))
<class '__main__.ObjectCreator'>
```

其实`type`还有一个完全不同的能力，它能够快速地创建类。`type`可以以参数的方式接收对一个类的描述，然后返回一个类。(可能有的人认为同一个函数根据传递不同的参数拥有两种完全不同的用途是一件很傻的事，但这是由于Python的向后兼容留下的问题)

通过`type`创建类的参数描述如下:

	type(name of the class, tuple of the parent class (for inheritance, can be empty), dictionary containing attributes names and values)

例如:

```Python
>>> class MyShinyClass(object):
...       pass
```

可以以如下方式手动创建:

```Python
>>> MyShinyClass = type('MyShinyClass', (), {}) # returns a class object
>>> print(MyShinyClass, MyShinyClass())
<class '__main__.MyShinyClass'> <__main__.MyShinyClass object at 0x10a7a5518>
```

你可能注意到了我们使用了"MyShinyClass"作为类的名字同时也作为变量名来保持对类的引用。它们可以不同，但是没有理由使其复杂化。
`type`接收一个字典来定义类的属性，因此:

```Python
>>> class Foo(object):
...       bar = True
```

可以被翻译成:

```Python
>>> Foo = type('Foo', (), {'bar': True})
```

这样定义的类也可以当做普通类使用:

```Python
print(Foo)  # <class '__main__.Foo'>
print(Foo.bar)  # True
f = Foo()
print(f)  # <__main__.Foo object at 0x8a9b84c>
print(f.bar)  # True
```

当然，你也可以继承自它:

```Python
>>>   class FooChild(Foo):
...         pass
```

将会是:

```Python
>>> FooChild = type('FooChild', (Foo,), {})
>>> print(FooChild, FooChild.bar)  # bar is inherited from Foo
<class '__main__.FooChild'> True
```

最终你会想为你的类添加一些方法。只需要使用正确的语法定义一个函数然后作为一个属性赋值给类:

```Python
>>> def echo_bar(self):
...       print(self.bar)
... 
>>> FooChild = type('FooChild', (Foo,), {'echo_bar': echo_bar})
>>> hasattr(Foo, 'echo_bar')
False
>>> hasattr(FooChild, 'echo_bar')
True
>>> my_foo = FooChild()
>>> my_foo.echo_bar()
True
```

你甚至可以在动态生成了类之后添加更多的方法，就和向普通生成的类对象添加方法一样:

```Python
>>> def echo_bar_more(self):
...       print('yet another method')
... 
>>> FooChild.echo_bar_more = echo_bar_more
>>> hasattr(FooChild, 'echo_bar_more')
True
```

如你所见:在Python中，类是对象，你可以快速动态地创建一个类。这便是当你使用关键字`class`时Python做的工作，它通过使用**元类**来完成这项工作。

#### 什么是元类(终于)

**元类**是创建类的那些"东西"。你为了创建对象而定义了类，但是我们知道Python中的类也是对象，因此，元类是用来创建对象的。它们是**类的类**，你可以形象化地理解:

```Python
MyClass = MetaClass()
MyObject = MyClass()
```

你已经知道`type`可以这么用:

```Python
MyClass = type('MyClass', (), {})
```

这是因为函数`type`实际上是一个元类，而且是Python用来创建所有类的元类。

<div class="tip">
 在Python中，所有东西都是对象
</div>

其中包括但不限于整型、字符串、函数和类。它们都是对象，而且它们都是被类创建的:

```Python
>>> age = 35
>>> age.__class__
<type 'int'>
>>> name = 'bob'
>>> name.__class__
<type 'str'>
>>> def foo(): pass
>>> foo.__class__
<type 'function'>
>>> class Bar(object): pass
>>> b = Bar()
>>> b.__class__
<class '__main__.Bar'>
```

现在让我们看看`__class__`的`__class__`:

```Python
>>> age.__class__.__class__
<type 'type'>
>>> name.__class__.__class__
<type 'type'>
>>> foo.__class__.__class__
<type 'type'>
>>> b.__class__.__class__
<type 'type'>
```

由此可见，一个元类正是用来创建所有类的。你也可以称它为"类工厂"。`type`是Python使用的内置的元类，当然，你也可以创建你自己的元类。

#### `__metaclass__`属性
你可以在编写一个类时为其指定`__metaclass__`属性:

```Python
class Foo(object):
    __metaclass__ = something...
    ...
```

需要注意的是，上述语法仅适用于Python 2.x版本，在Python 3.x版本中，由新语法替代:

```Python
class Foo(object, metaclass=something):
    pass
```

当你为类指定了元类以后，Python将会使用该元类来创建类`Foo`。
特别注意:

<div class="tip">
类对象在Python调用__metaclass__来创建类之后才会存在。
</div>

** Python 2.x中的__metaclass__ **
对Python 2.x来说，即当首先写下了`class Foo(object)`，但是类对象`Foo`还并没有在内存中被创建。Python将会在类定义中查找`__metaclass__`，如果找到了，则用其来创建对象类`Foo`，如果没有找到，Python将会使用`type`来创建该类。

当你这么写:

```Python
class Foo(Bar):
    pass
```

Python将会这么做:
1. 类`Foo`有定义`__metaclass__`吗？如果有，则使用指定的`__metaclass__`来创建类对象`Foo`。
2. 如果没有找到这个属性，它将会在父类`Bar`中找
3. 这样一直向父类找，直到达到`module`级别才停止。
4. 如果在任何父类都找不到，那就用`type`创建类对象`Foo`

这里面有几点需要注意:
1. 为子类指定的`__metaclass__`需要是其所有父类`__metaclass__`的子类。
2. 在多继承的情况下，如果没有为该类指定`__metaclass__`，则该类将会由MRO中第一个父类的`__metaclass__`和所有父类`__metaclass__`中处于继承最底层的`__metaclass__`生成。

Python 2.x中`__metaclass__`使用如以下代码所示:

```Python
# Python 2.x
class Meta0(type):
    def __new__(meta, name, bases, cls_dict):
        cls = type.__new__(meta, name, bases, cls_dict)
        print(meta, name, bases, cls_dict)
        return cls

__metaclass__ = Meta0

class Meta(type):
    def __new__(meta, name, bases, cls_dict):
        print(meta, name, bases, cls_dict)
        cls_dict['meta'] = True
        cls = type.__new__(meta, name, bases, cls_dict)
        return cls

class Meta2(Meta):
    def __new__(meta, name, bases, cls_dict):
        print(meta, name, bases, cls_dict)
        cls_dict['meta2'] = True
        cls = type.__new__(meta, name, bases, cls_dict)
        return cls

class Meta3(Meta2):
    def __new__(meta, name, bases, cls_dict):
        print(meta, name, bases, cls_dict)
        cls_dict['meta3'] = True
        cls = type.__new__(meta, name, bases, cls_dict)
        return cls

print('C1')
class C1:
    pass

print('C2')
class C2:
    __metaclass__ = Meta

print('C3')
class C3(C2):
    pass

print('C4')
class C4(C2):
    __metaclass__ = Meta2

print('C5')
class C5(C2):
    pass

print('C6')
class C6(C2):
    __metaclass__ = Meta3

print('C7')
class C7(C4, C6, C5):
    pass
```

结果为:

```Python
C1
(<class '__main__.Meta0'>, 'C1', (), {'__module__': '__main__'})
C2
(<class '__main__.Meta'>, 'C2', (), {'__module__': '__main__', '__metaclass__': <class '__main__.Meta'>})
C3
(<class '__main__.Meta'>, 'C3', (<class '__main__.C2'>,), {'__module__': '__main__'})
C4
(<class '__main__.Meta2'>, 'C4', (<class '__main__.C2'>,), {'__module__': '__main__', '__metaclass__': <class '__main__.Meta2'>})
C5
(<class '__main__.Meta'>, 'C5', (<class '__main__.C2'>,), {'__module__': '__main__'})
C6
(<class '__main__.Meta3'>, 'C6', (<class '__main__.C2'>,), {'__module__': '__main__', '__metaclass__': <class '__main__.Meta3'>})
C7
(<class '__main__.Meta2'>, 'C7', (<class '__main__.C4'>, <class '__main__.C6'>, <class '__main__.C5'>), {'__module__': '__main__'})
(<class '__main__.Meta3'>, 'C7', (<class '__main__.C4'>, <class '__main__.C6'>, <class '__main__.C5'>), {'__module__': '__main__', 'meta2': True})
```

注意到在类`C7`的生成过程中，分别调用了`Meta2`和`Meta3`，调用`Meta2`是由于在`C7`的继承中，类`C4`位于第一位，而`C4`的`__metaclass__`为`Meta2`，所以首先使用`Meta2`，而在`C4`、`C5`和`C6`的`__metaclass__`中，`Meta3`处于继承最底层，所以还会调用`Meta3`来生成类`C7`。(如果类`C6`位于最前面则只会调用`Meta3`)
这样的多继承以及多元类调用比较复杂，个人认为还是少用较好。

** Python 3.x中的metaclass **
在Python3.x中，需要通过关键字参数`metaclass`给类指定元类。如:

```Python
class C1(metaclass=Meta):
    pass
```

关于元类的寻找与Python 2.x类似:
1. 类`Foo`有定义关键字参数`metaclass`吗？如果有，则使用指定的`metaclass`来创建类对象`Foo`。
2. 如果没有找到这个属性，它将会在父类`Bar`中找
3. 如果在任何父类都找不到，那就用`type`创建类对象`Foo`

Python 3.x的metaclass使用注意仍然与Python 2.x类似:
1. 为子类指定的`metaclass`需要是其所有父类`metaclass`的子类。
2. 在多继承的情况下，如果没有为该类指定`metaclass`，则该类将会由所有父类`metaclass`中处于继承最底层的`metaclass`生成。如果有指定，则选择前述的`metaclass`和该`metaclass`中继承层次更低的那个来生成。

Python 3.x中`metaclass`使用如以下代码所示:

```Python
# Python 3.x
class Meta(type):
    def __new__(meta, name, bases, cls_dict):
        print(meta, name, bases, cls_dict)
        return type.__new__(meta, name, bases, cls_dict)

class Meta2(Meta):
    def __new__(meta, name, bases, cls_dict):
        print(meta, name, bases, cls_dict)
        cls_dict['hello'] = True
        return type.__new__(meta, name, bases, cls_dict)

class Meta3(Meta2):
    def __new__(meta, name, bases, cls_dict):
        print(meta, name, bases, cls_dict)
        return type.__new__(meta, name, bases, cls_dict)

class Meta4(Meta3):
    def __new__(meta, name, bases, cls_dict):
        print(meta, name, bases, cls_dict)
        return type.__new__(meta, name, bases, cls_dict)


print('C1')
class C1(metaclass=Meta):
    pass

print('C2')
class C2(C1):
    pass

print('C3')
class C3(C1, metaclass=Meta2):
    pass

print('C4')
class C4(C1, metaclass=Meta3):
    pass

print('C5')
class C5(C3, C4, C2):
    pass

print('C6')
class C6(C3, C4, C2, metaclass=Meta4):
    pass
```

结果为:

```Python
C1
<class '__main__.Meta'> C1 () {'__module__': '__main__', '__qualname__': 'C1'}
C2
<class '__main__.Meta'> C2 (<class '__main__.C1'>,) {'__module__': '__main__', '__qualname__': 'C2'}
C3
<class '__main__.Meta2'> C3 (<class '__main__.C1'>,) {'__module__': '__main__', '__qualname__': 'C3'}
C4
<class '__main__.Meta3'> C4 (<class '__main__.C1'>,) {'__module__': '__main__', '__qualname__': 'C4'}
C5
<class '__main__.Meta3'> C5 (<class '__main__.C3'>, <class '__main__.C4'>, <class '__main__.C2'>) {'__module__': '__main__', '__qualname__': 'C5'}
C6
<class '__main__.Meta4'> C6 (<class '__main__.C3'>, <class '__main__.C4'>, <class '__main__.C2'>) {'__module__': '__main__', '__qualname__': 'C6'}
```

需要注意一点，为了输出内容的简洁，以上代码在方法`__new__`的最后都使用了`type.__new__`而不是`super().__new__`。改用`super().__new__`后执行仍相同，只是多了对父类的调用。

说了这么多，我们应该给`__metaclass__`赋值什么呢?答案当然是，一个可以创建类的东西。
那么，什么才能创建一个类呢？

#### 普通的元类
设计元类的一个很主要的原因就是为了在类被创建的时候进行自动修改，这经常用在API的设计上。
让我们举一个简单的例子，你决定让你的模块里所有类的属性都是大写形式。要完成这项工作有很多方法，其中一个便是在模块级别上定义`__metaclass__`。这样的话，该模块中所有的类都会通过该元类创建，我们只需要让这个元类完成将所有属性变成大写的工作。
幸运的是，`__metaclass__`可以是任何可调用(callable)对象，并不一定非要是一个正式的类。所以我们将从一个函数作为元类的例子说起:

```Python
# Python 2.x
# the metaclass will automatically get passed the same argument
# that you usually pass to `type`
def upper_attr(future_class_name, future_class_parents, future_class_attr):
  """
    Return a class object, with the list of its attribute turned 
    into uppercase.
  """

  # pick up any attribute that doesn't start with '__' and uppercase it
  uppercase_attr = {}
  for name, val in future_class_attr.items():
      if not name.startswith('__'):
          uppercase_attr[name.upper()] = val
      else:
          uppercase_attr[name] = val

  # let `type` do the class creation
  return type(future_class_name, future_class_parents, uppercase_attr)

__metaclass__ = upper_attr # this will affect all classes in the module

class Foo(): # global __metaclass__ won't work with "object" though
  # but we can define __metaclass__ here instead to affect only this class
  # and this will work with "object" children
  bar = 'bip'

print(hasattr(Foo, 'bar'))
# Out: False
print(hasattr(Foo, 'BAR'))
# Out: True

f = Foo()
print(f.BAR)
# Out: 'bip'
```

现在，让我们完成同样的工作，但这次我们将会使用一个真正的类作为元类:

```Python
# Python 2.x
# remember that `type` is actually a class like `str` and `int`
# so you can inherit from it
class UpperAttrMetaclass(type): 
    # __new__ is the method called before __init__
    # it's the method that creates the object and returns it
    # while __init__ just initializes the object passed as parameter
    # you rarely use __new__, except when you want to control how the object
    # is created.
    # here the created object is the class, and we want to customize it
    # so we override __new__
    # you can do some stuff in __init__ too if you wish
    # some advanced use involves overriding __call__ as well, but we won't
    # see this
    def __new__(upperattr_metaclass, future_class_name, 
                future_class_parents, future_class_attr):

        uppercase_attr = {}
        for name, val in future_class_attr.items():
            if not name.startswith('__'):
                uppercase_attr[name.upper()] = val
            else:
                uppercase_attr[name] = val

        return type(future_class_name, future_class_parents, uppercase_attr)
```

但是上面这种方法并不是很符合OOP，因为我们直接调用了`type`而且我们没有重写或者调用父类的`__new__`，让我们改为下面这样:

```Python
# Python 2.x
class UpperAttrMetaclass(type): 

    def __new__(upperattr_metaclass, future_class_name, 
                future_class_parents, future_class_attr):

        uppercase_attr = {}
        for name, val in future_class_attr.items():
            if not name.startswith('__'):
                uppercase_attr[name.upper()] = val
            else:
                uppercase_attr[name] = val

        # reuse the type.__new__ method
        # this is basic OOP, nothing magic in there
        return type.__new__(upperattr_metaclass, future_class_name, 
                            future_class_parents, uppercase_attr)
```

你可能注意到了一个额外的参数`upperattr_metaclass`，它其实并不特别:`__new__`总是将定义它的类作为第一个参数，就和实例方法中使用`self`或类方法中使用`cls`作为方法的第一个参数一样。当然，此处参数所使用的名字只是为了方便明确参数意义，但就跟`self`一样，所有参数都可以简写，因此实际使用中的一个元类可能看起来像这样:

```Python
class UpperAttrMetaclass(type): 

    def __new__(cls, clsname, bases, dct):

        uppercase_attr = {}
        for name, val in dct.items():
            if not name.startswith('__'):
                uppercase_attr[name.upper()] = val
            else:
                uppercase_attr[name] = val

        return type.__new__(cls, clsname, bases, uppercase_attr)
```

是的，元类在完成一些"黑魔法"或者复杂事务的时候很有用，但是对于它们自身来说，其实很简单:
1. 拦截一个类的创建
2. 修改这个类
3. 返回修改后的类

#### 你为什么要使用类而不是函数来作为元类？
由于`__metaclass__`可以接受任意可调用对象，那为什么你要使用一个明显更复杂的类呢？

有几个原因:
* 意图明确。当你阅读到`UpperAttrMetaclass(type)`，你知道接下来会怎样
* 你可以使用OOP。元类可以继承，重写父类方法，甚至可以使用元类
* 你可以更好地组织里的代码。你不会在一些简单的工作中使用到元类，它通常是为了复杂工作准备的。编写多个方法并且将它们组织到一个类里将会对使代码清晰易读有巨大的帮助。
* 你可以拦截`__new__`、`__init__`和`__call__`等方法。这将允许你完成不同的工作。即使通常情况下你可以在`__new__`完成所有工作，但仍有许多人更偏爱在`__init__`中完成。
* 它们叫做metaclass，`class`!

#### 为什么你要使用元类呢？
现在到了最关键的问题，为什么你要使用一些既复杂又易错的功能呢？
实际上，通常情况下你不用:
> Metaclasses are deeper magic that 99% of users should never worry about. If you wonder whether you need them, you don't (the people who actually need them know with certainty that they need them, and don't need an explanation about why).      --- Python Guru Tim Peters
> 译: 元类是较为高深的技术，99%的用户应该永远不用担心。如果你在犹豫你是否需要它们，那么你不需要(真正需要它们的人会清楚的知道需要它们，而且无须解释)

元类主要的用途是创建一个API。一个典型的例子就是Django的ORM，它允许你这样定义:

```Python
class Person(models.Model):
  name = models.CharField(max_length=30)
  age = models.IntegerField()
```

但是如果你这样做:

```Python
guy = Person(name='bob', age='35')
print(guy.age)
```

它并不会返回一个`IntegerField`对象，而是返回一个`int`。这是因为`models.Model`定义了`__metaclass__`，而该元类将会完成一些工作使得你刚刚定义拥有一些简单语句的`Person`变成复杂的钩子(hook)与数据库字段相连。Django通过引入一个简单的API和使用元类来使一些复杂的事情看起来简单，根据该API重建代码完成实际工作都在幕后进行。

#### 结束语
首先，你知道了类也是对象，而且可以生成实例。当然，类也是元类的实例。
Python中的万物都是对象，它们要么是类的实例，要么是元类的实例。`type`除外:

<div class="tip">
`type`是它自己的元类
</div>

其次，元类十分复杂。对一个简单类的修改你可能并不会想使用它，而是使用另外两种不同的方式:
* [Monkey patching](https://en.wikipedia.org/wiki/Monkey_patch)
* 类装饰器

在99%你需要修改类的情况下，你都最好使用以上两种方法。
但99%的时间里，你都不需要修改类。