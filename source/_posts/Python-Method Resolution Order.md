---
layout: post
title: Python中的MRO
tags: [Python,类,继承]
category: Python
date: 2017-01-22 15:23
from: https://www.python.org/download/releases/2.3/mro
---

今天我想对Python中的方法解析顺序使用的C3算法进行一个梳理，文章内容主要基于对[The Python 2.3 Method Resolution Order](https://www.python.org/download/releases/2.3/mro/)一文的节选翻译。

首先，需要明白的是C3算法工作于Python 2.2引入的新式类(*new style classes*)，经典类(*classic classes*)中方法的解析仍然保持他们原有的顺序，即`深度优先，从左至右`，在此不进行深一步的讨论。

<!-- more -->

先来看一个例子:

```Python
>>> O = object
>>> class X(O): pass
>>> class Y(O): pass
>>> class A(X, Y): pass
>>> class B(Y, X): pass
```

继承顺序如图:
![Inheritance](python_inheritance.png)

在这种情况下，通过A和B派生出一个新类C是有问题的，因为在A的继承中X先于Y,而在B中Y先于X，因此C中方法解析顺序会存在歧义。Python 2.3在这种情况下通过抛出异常`TypeError: MRO conflict among bases Y, X`来避免程序员创建有歧义的类。

#### C3算法
首先介绍一些简易记号来方便接下来的描述。
> $$C_1C_2...C_n$$

表示一个类的列表`[C1, C2, ..., Cn]`。

列表的`head`为其第一个元素, `tail`为其余下元素:
> $$\begin{align}head &= C_1\\\\tail &= C_2...C_n\end{align}$$

使用
> $$C+(C_1C_2...C_n) = CC_1C_2...C_n$$

来表示`[C]+[C1, C2, ..., Cn]`。

线性化(*linearization*)定义:
> 类C的线性化是指类C加上其父类的线性化以及其父类列表本身得到的和(列表)。

用符号记号来描述:
> $$L[C(B_1...B_n)] = C + merge(L[B_1]...L[B_n], B_1...B_n)$$

特别的，如果C是`object`类，即不存在父类，其线性化结果为:
> $$L[object] = object$$

然而，要计算合并顺序需要遵循以下规则:
> 取第一个列表的`head`，如$L[B_1][0]$；如果该`head`不在其余任一列表的尾部，将其加入类C的线性化结果列表中并将其从所有待合并列表中删除，否则从下一个列表中取出`head`并按上述规则处理。重复上述操作指导所有类都已经被删除或者无法再找到符合要求的`head`。在后者情况下，不可能完成merge操作，Python 2.3将会拒绝创建类C并抛出异常。

下面举例说明，考虑如下继承:
```Python
>>> O = object
>>> class F(O): pass
>>> class E(O): pass
>>> class D(O): pass
>>> class C(D, F): pass
>>> class B(D, E): pass
>>> class A(B, C): pass
```

继承顺序如图:
![Inheritance2](python_inheritance2.png)

B的线性化计算公式可以表示如下:
> $$L[B] = B + merge(DO, EO, DE)$$

根据前述规则，我们首先取D作为`head`，待合并列表变成了$merge(O, EO, E)$，由于O不符合条件，我们跳过第一个列表在第二个列表中选择符合条件的E作为`head`，待合并列表变成了$merge(O, O)$，最后我们选择了O,因此:
> $$L[B] = B D E O$$

同理可以得到C的线性化结果:
> $$\begin{align}L[C] &= C + merge(DO, FO, DF)\\\\&=C+D+merge(O, FO, F)\\\\&=C+D+F+merge(O, O)\\\\&=C\;D\;F\;O\end{align}$$

最后来计算A的线性化结果:
> $$\begin{align}L[A] &= A + merge(BDEO, CDFO, BC)\\\\&=A+B+merge(DEO, CDFO, C)\\\\&=A+B+C+merge(DEO, DFO)\\\\&=A+B+C+D+merge(EO, FO)\\\\&=A+B+C+D+E+merge(O, FO)\\\\&=A+B+C+D+E+F+merge(O, O)\\\\&=A\;B\;C\;D\;E\;F\;O\end{align}$$

在Python 2.2以后，可以直接通过调用`.mro()`方法获得MRO:
```Python
>>> A.mro()
[<class '__main__.A'>, <class '__main__.B'>, <class '__main__.E'>,
<class '__main__.C'>, <class '__main__.D'>, <class '__main__.F'>,
<type 'object'>]
```

最后，让我们回到最初的那个例子，其所有类的线性化结果计算如下:
> $$\begin{align}&L[O] = O\\\\&L[X] = X\;O\\\\&L[Y] = Y\;O\\\\&L[A] = A\;X\;Y\;O\\\\&L[B] = B\;Y\;X\;O\end{align}$$

然而，对于继承自类A和类B的类C来说是无法线性化的:
> $$\begin{align}L[C] &= C + merge(AXYO, BYXO, AB)\\\\&=C+A+merge(XYO, BYXO, B)\\\\&=C+A+B+merge(XYO, YXO)\end{align}$$

在此刻，我们无法完成对XYO和YXO的合并，因为X是YXO的尾，同时Y是XYO的尾，因此C3算法停止，Python 2.3将会抛出异常并拒绝创建类C。

#### 不好的MRO
当一个MRO破坏了局部优先顺序和单调性等基础性质时称其为不好的MRO。
考虑如下例子:
```Python
>>> F=type('Food',(),{'remember2buy':'spam'})
>>> E=type('Eggs',(F,),{'remember2buy':'eggs'})
>>> G=type('GoodFood',(F,E),{}) # under Python 2.3 this is an error!
```

创建了F、E、G三个类，其中类E可表示为`class E(F)`，类G可表示为`class G(F, E)`，我们期望类G的`remember2buy`属性是继承自F而不是E的，然而在Python 2.2中我们会得到
```Python
>>> G.remember2buy
'eggs'
```

这破坏了局部优先顺序,因为对于类G的继承顺序`(F, E)`,其局部优先顺序并没有在Python 2.2线性化结果中得到保留:
> $$L[G, P22] = G\;E\;F\;object$$

有人可能会争辩说Python 2.2线性化结果中类F在类E之后的原因是因为类F没有类E更具体，因为类F是类E的父类；尽管如此打破了局部优先顺序会使得代码不直观且容易出错，一个有力的佐证就是其与经典类的不同:
```Python
>>> class F: remember2buy='spam'
>>> class E(F): remember2buy='eggs'
>>> class G(F,E): pass
>>> G.remember2buy
'spam'
```

回想之前谈到的，经典类的继承顺序为`深度优先，从左至右`，因此类G的MRO为GFEF，在这种情况下局部优先顺序得到了保留。
简而言之，像之前那种继承方式应该避免，Python 2.3开始通过抛出异常来避免了这种歧义，有力地阻止了程序员来创建有歧义的类继承(通过C3算法失败来完成)。

还有一点相关的，Python 2.3的算法足够智能来发现一些显而易见的错误，比如重复继承同一个父类:
```Python
>>> class A(object): pass
>>> class C(A,A): pass # error
Traceback (most recent call last):
  File "<stdin>", line 1, in ?
TypeError: duplicate base class A
```

而这种情况在Python 2.2中(无论是经典类还是新式类)，都不会抛出异常。

最后，有一点十分重要的需要记住:
* MRO在决定方法解析顺序同时也决定了属性的解析顺序

讨论完了局部优先顺序，下面再来看单调性问题。要证明经典类的MRO是非单调的很容易:
![Inheritance3](python_inheritance3.png)

> $$\begin{align}&L[B, P22] = B\;C\quad\\#\;B在C之前：类B的方法优先\\\\&L[D, P22] = D\;A\;C\;B\;C\quad\\#\;B在C之后：类C的方法优先\end{align}$$

另一方面，Python 2.2和Python 2.3的MRO中都不存在问题，都给出了:
> $$L[D] = D\;A\;B\;C$$

Guido在他的[一篇文章](https://www.python.org/download/releases/2.2.3/descrintro/#mro)指出了经典类的MRO在实际使用中其实并不差，因为它可以使经典类避免钻石型结构。但由于所有新式类都继承自`object`，因此钻石型结果无法避免而且在所有的多继承图中前后矛盾都会出现。
Python 2.2的MRO使得破坏单调性十分困难，但并非不可能。接下来这个由*Samuele Pedroni*提供的例子，表明了Python 2.2新式类的MRO是非单调的:
```Python
>>> class A(object): pass
>>> class B(object): pass
>>> class C(object): pass
>>> class D(object): pass
>>> class E(object): pass
>>> class K1(A,B,C): pass
>>> class K2(D,B,E): pass
>>> class K3(D,A):   pass
>>> class Z(K1,K2,K3): pass
```

![Inheritance4](python_inheritance4.png)

使用C3算法的线性化结果如下:
> $$\begin{align}&L[A] = A\;O\\\\&L[B] = B\;O\\\\&L[C] = C\;O\\\\&L[D] = D\;O\\\\&L[E] = E\;O\\\\&L[K1] = K1\;A\;B\;C\;O\\\\&L[K2] = K2\;D\;B\;E\;O\\\\&L[K3] = K3\;D\;A\;O\\\\&L[Z] = Z\;K1\;K2\;K3\;D\;A\;B\;C\;E\;O\end{align}$$

Python 2.2对于A、B、C、D、E、K1、K2、K3的线性化给出了相同结果，但是对于Z则不同:
> $$L[Z, P22] = Z\;K1\;K3\;A\;K2\;D\;B\;C\;E\;O$$ 

显然这个线性化结果是错的，因为类先于D出现了，而K3的线性化结果中D先于A出现。换句话说，在K3中，从类A继承的方法被从类D继承的方法覆盖了，但是在Z中，作为一个K3的子类，却使用了从类A继承的方法去覆盖从类D继承的方法！这违反了单调性。此外，Python 2.2中类Z的线性化结果与局部优先顺序也不一致，类Z的局部优先列表为`[K1, K2, K3]`(K2在K3之前)，而在线性化结果中K3在K2之前，这些问题解释了为什么2.2中的规则被弃用转投C3规则。

#### super函数
最后再来看Python 2.2引入的`super`函数，它主要用于初始化父类，避免了直接调用父类的`__init__`函数，减少耦合性，来看以下代码:
```Python
class Base(object):
    def __init__(self, value):
        self.value = value

class TimesFive(Base):
    def __init__(self, value):
        super(TimesFive, self).__init__(value)
        self.value *= 5

class PlusTwo(Base):
    def __init__(self, value):
        super(PlusTwo, self).__init__(value)
        self.value += 2

class GoodWay(TimesFive, PlusTwo):
    def __init__(self, value):
        super(GoodWay, self).__init__(value)

foo = GoodWay(5)
```

它的计算顺序为`5 * (5 + 2)`而不是`(5 * 5) + 2`，原因在于程序的运行顺序与类GoodWay的MRO保持了一致，通过查看`GoodWay.mro()`可以得到:
```Python
>>> GoodWay.mro()
[<class '__main__.GoodWay'>, <class '__main__.TimesFive'>, <class '__main__.PlusTwo'>, <class '__main__.Base'>, <class 'object'>]
```

调用`GoodWay(5)`的时候，它会调用`TimesFive.__init__`，而`TimesFive.__init__`又会调用`PlusTwo.__init__`，而`PlusTwo.__init__`会调用`Base.__init__`，当到达了钻石体系的顶部之后，所有的初始化方法会按照与刚才那些`__init__`相反的顺序执行，因此`Base.__init__`将value设为5，`PlusTwo.__init__`在此基础上加2，value变为7，最后`TimesFive.__init__`将value乘以5，得到35。
#### 特别注意
一看到`super`这个函数很多人第一想法就是父类，但其实`super`工作原理是这样的:
```Python
def super(cls, inst):
    mro = inst.__class__.mro()
    return mro[mro.index(cls) + 1]
```

根据实例inst获得其类的MRO列表，返回cls所在位置的下一个位置的类，其中`inst`永远是最开始那个实例。

Python 3提供了一种不带参数的`super`调用方式，例如:
```Python
class Explicit(Base):
    def __init__(self, value):
        super().__init__(value)

class Implicit(Base):
    def __init__(self, value):
        super(__class__, self).__init__(value)

assert Explicit(10).value == Implicit(10).value
```

由于Python 3程序可以在方法中通过__class__变量准确地引用当前类，所以上面的这种写法能够正常运作，而Python 2中则没有定义__class__，故而不能采用这种写法。可能有人试着用self.__class__做参数来调用`super`,但实际上这么做不行，因为Python 2是用[特殊方式实现super](http://stackoverflow.com/questions/18208683/when-calling-super-in-a-derived-class-can-i-pass-in-self-class)的。