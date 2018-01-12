---
title: Python中yield的作用
date: 2017-02-10 10:42:13
tags: [Python,生成器,迭代器]
categories: Python
from: http://stackoverflow.com/questions/231767/what-does-the-yield-keyword-do
---
最近在[StackOverflow](http://stackoverflow.com)上看的问题回答比较多，今天这篇是关于介绍Python生成器的相关思想以及其中关键字`yield`用法的翻译内容。

为了搞清楚`yield`是用来做什么的，你首先得知道Python中***生成器***的相关概念，而为了了解生成器的相关概念，你需要知道什么是***迭代器***。

<!-- more -->
<div class="tip">
本篇中的Python除了特殊说明外都是Python 2.x
</div>

#### 迭代器
当你创建一个了列表，你可以逐个遍历列表中的元素，而这个过程便叫做***迭代***:

```Python
>>> mylist = [1, 2, 3]
>>> for i in mylist:
...    print(i)
1
2
3
```

而`mylist`是一个***可迭代对象***。当你使用列表推导式的时候，创建了一个列表，他也是可迭代对象:

```Python
>>> mylist = [x*x for x in range(3)]
>>> for i in mylist:
...    print(i)
0
1
4
```

所有能够接受`for...in...`操作的对象都是可迭代对象，如列表、字符串、文件等。这些可迭代对象用起来都十分顺手因为你可以按照你的想法去访问它们，但是你把所有数据都保存在了内存中，而当你有大量数据的时候这可能并不是你想要的结果。

#### 生成器
生成器也是迭代器，但是**你只能对它们进行一次迭代**，原因在于它们并没有将所有数据存储在内存中，而是即时生成这些数据:

```Python
>>> mygenerator = (x*x for x in range(3))
>>> for i in mygenerator:
...    print(i)
0
1
4
```

这一段代码和上面那段很相似，唯一不同的地方是使用了`()`代替`[]`。但是，这样的后果是你无法对`mygenerator`进行第二次`for i in mygenerator`，因为生成器只能被使用一次:它首先计算出结果0，然后忘记它再计算出1，最后是4，一个接一个。

#### Yield
`yield`是一个用法跟`return`很相似的关键字，不同在于函数返回的是一个生成器。

```Python
>>> def createGenerator():
...    mylist = range(3)
...    for i in mylist:
...        yield i*i
...
>>> mygenerator = createGenerator() # create a generator
>>> print(mygenerator) # mygenerator is an object!
<generator object createGenerator at 0xb7555c34>
>>> for i in mygenerator:
...     print(i)
0
1
4
```

这是一个没有什么用的例子，但是用来让你了解当你知道你的函数会返回一个只会被遍历1次的巨大数据集合该怎么做的时候十分方便。为了掌握`yield`，你必须了解**当你调用这个函数的时候，你在函数体中写的代码并没有被执行**，而是只返回了一个生成器对象，这个需要特别注意。然后，你的代码将会在每次`for`使用这个生成器的时候被执行。最后，最困难的部分:
> `for`第一次调用通过你函数创建的生成器对象的时候，它将会从你函数的开头执行代码，一直到到达`yield`，然后它将会返回循环中的第一个值。然后，其他每次调用都会再一次执行你在函数中写的那段循环，并返回下一个值，直到没有值可以返回。

生成器在函数执行了却没有到达`yield`的时候将被认为是空的，原因在于循环到达了终点，或者不再满足`if/else`条件。

#### 处理生成器耗尽
考虑以下代码:

```Python
>>> class Bank(): # let's create a bank, building ATMs
...    crisis = False
...    def create_atm(self):
...        while not self.crisis:
...            yield "$100"

>>> hsbc = Bank() # when everything's ok the ATM gives you as much as you want
>>> corner_street_atm = hsbc.create_atm()
>>> print(corner_street_atm.next())
$100
>>> print(corner_street_atm.next())
$100
>>> print([corner_street_atm.next() for cash in range(5)])
['$100', '$100', '$100', '$100', '$100']

>>> hsbc.crisis = True # crisis is coming, no more money!
>>> print(corner_street_atm.next())
<type 'exceptions.StopIteration'>
>>> wall_street_atm = hsbc.create_atm() # it's even true for new ATMs
>>> print(wall_street_atm.next())
<type 'exceptions.StopIteration'>
>>> hsbc.crisis = False # trouble is, even post-crisis the ATM remains empty
>>> print(corner_street_atm.next())
<type 'exceptions.StopIteration'>
>>> brand_new_atm = hsbc.create_atm() # build a new one to get back in business
>>> for cash in brand_new_atm:
...    print cash
$100
$100
$100
$100
$100
$100
$100
$100
$100
...
```

首先看生成器的`next`方法，它用来执行代码并从生成器中获取下一个元素(在Python 3.x中生成器已经没有next方法，而是使用next(iterator)代替)。在`crisis`未被置为`True`的时候，`create_atm`函数中的`while`循环可以看做是无尽的，当`crisis`为`True`的时候，跳出了`while`循环，所有迭代器将会到达函数尾部，此时再次访问`next`将会抛出`StopIteration`异常，而此时就算将`crisis`设置为`False`，这些生成器仍然处在函数尾部，访问会继续抛出`StopIteration`异常。

将以上例子用来控制访问资源等用途的时候十分有用。

#### `itertools`，你的好朋友
`itertools`模块包含了许多用来操作可迭代对象的函数。想复制一个生成器？向连接两个生成器？想把多个值组合到一个嵌套列表里面？使用`map/zip`而不用重新创建一个列表？那么就:`import itertools`吧。

让我们来看看四匹马赛跑可能的到达结果:

```Python
>>> horses = [1, 2, 3, 4]
>>> races = itertools.permutations(horses)
>>> print(races)
<itertools.permutations object at 0xb754f1dc>
>>> print(list(itertools.permutations(horses)))
[(1, 2, 3, 4),
 (1, 2, 4, 3),
 (1, 3, 2, 4),
 (1, 3, 4, 2),
 (1, 4, 2, 3),
 (1, 4, 3, 2),
 (2, 1, 3, 4),
 (2, 1, 4, 3),
 (2, 3, 1, 4),
 (2, 3, 4, 1),
 (2, 4, 1, 3),
 (2, 4, 3, 1),
 (3, 1, 2, 4),
 (3, 1, 4, 2),
 (3, 2, 1, 4),
 (3, 2, 4, 1),
 (3, 4, 1, 2),
 (3, 4, 2, 1),
 (4, 1, 2, 3),
 (4, 1, 3, 2),
 (4, 2, 1, 3),
 (4, 2, 3, 1),
 (4, 3, 1, 2),
 (4, 3, 2, 1)]
```

#### 迭代的内部机理
迭代是一个依赖于可迭代对象(需要实现`__iter__()`方法)和迭代器(需要实现`__next__()`方法)的过程。
> 可迭代对象是任意你可以从中得到一个迭代器的对象。
  
> 迭代器是让你可以对可迭代对象进行迭代的对象。

#### 总结
`yield`语句将你的函数转化成一个能够生成一种能够包装你原函数体的名叫***生成器***的特殊对象的工厂。当生成器被迭代，它将会起始位置开始执行函数一直到到达下一个`yield`，然后挂起执行，计算返回传递给`yield`的值，它将会在每次迭代的时候重复这个过程直到函数执行到达函数的尾部，举例来说:

```Python
def simple_generator():
    yield 'one'
    yield 'two'
    yield 'three'

for i in simple_generator():
    print i
```

输出结果为:

```
one
two
three
```

这种效果的产生是由于在循环中使用了可以产生序列的生成器，生成器在每次循环时执行代码到下一个`yield`，并计算返回结果，这样生成器即时生成了一个列表，这对于特别是大型计算来说内存节省十分有效。

假设你想实现自己的可以产生一个可迭代一定范围数的`range`函数(特指Python 2.x中的`range`)，你可以这样做和使用:

```Python
def myRangeNaive(i):
    n = 0
    range = []
    while n < i:
        range.append(n)
        n = n + 1
    return range

for i in myRangeNaive(10):
    print i
```

但是这样并不高效，原因1：你创建了一个你只会使用一次的列表；原因2：这段代码实际上循环了两次。
由于Guido和他的团队很慷慨地开发了生成器因此我们可以这样做:

```Python
def myRangeSmart(i):
    n = 0
    while n < i:
       yield n
       n = n + 1
    return

for i in myRangeSmart(10):
    print i
```

现在，每次对生成器迭代将会调用`next()`来执行函数体直到到达`yield`语句，然后停止执行，并计算返回结果，或者是到达函数体尾部。在这种情况下，第一次的调用`next()`将会执行到`yield n`并返回`n`，下一次的`next()`将会执行自增操作，然后回到`while`的判断，如果满足条件，则再一次停止并返回`n`，它将会以这种方式执行一直到不满足`while`条件，使得生成器到达函数体尾部。

