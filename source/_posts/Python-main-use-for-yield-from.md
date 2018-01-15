---
title: Python中yield from的用法
date: 2017-02-10 13:22:58
tags: [Python,生成器,迭代器]
categories: Python
from: http://stackoverflow.com/a/26109157/331785
---

上一篇中谈到了迭代器、生成器以及`yield`的相关内容，而Python 3.3中，引入了在[PEP 380 -- Syntax for Delegating to a Subgenerator](https://www.python.org/dev/peps/pep-0380/)中提出的`yield from`关键字，大幅简化了Python程序员在使用协程的时候的编程过程。

<div class="tip">
本文内容除特殊说明外均基于Python 3.3以上版本。
</div>

首先需要声明的是，`yield from g`并不完全等于`for v in g: yield v`。而是应该将`yield from`看成为**调用者(caller)**和**子生成器(sub-generator)**之间提供了一种**透明地双向通道**。这包括了从子生成器中获取数据并向子生成器发送数据。

<!-- more -->

#### 使用`yield from`从生成器中获得数据
考虑以下代码:

```Python
def reader():
    """A generator that fakes a read from a file, socket, etc."""
    for i in range(4):
        yield '<< %s' % i

def reader_wrapper(g):
    # Manually iterate over data produced by reader
    for v in g:
        yield v

wrap = reader_wrapper(reader())
for i in wrap:
    print(i)

# Result
<< 0
<< 1
<< 2
<< 3
```

我们其实可以使用`yield from`来代替亲自迭代`reader()`:

```Python
def reader_wrapper(g):
    yield from g
```

这可以很好的工作而且减少了一行代码，而且可能使得我们的意图更加明确。

#### 使用`yield from`向生成器发送数据
现在让我们做些更有趣的。首先创建一个名叫`writer`的协程，它可以接收发送给它的数据并写给套接字、文件描述符等等:

```Python
def writer():
    """A coroutine that writes data *sent* to it to fd, socket, etc."""
    while True:
        w = (yield)
        print('>> ', w)
```

现在的问题是，包装函数`wrapper`如何处理将数据发送给`writer`，使得发送给包装函数的数据能够透明地发送给`writer()`？

```Python
def writer_wrapper(coro):
    # TBD
    pass

w = writer()
wrap = writer_wrapper(w)
wrap.send(None)  # "prime" the coroutine
for i in range(4):
    wrap.send(i)

# Expected result
>>  0
>>  1
>>  2
>>  3
```

包装函数需要接受发送给它的数据(显而易见地)而且应该在循环结束的时候处理`StopIteration`异常。很明显只是完成`for x in coro: yield x`的话不能胜任这项工作。下面是一个能够工作的版本:

```Python
def writer_wrapper(coro):
    coro.send(None)  # prime the coro
    while True:
        try:
            x = (yield)  # Capture the value that's sent
            coro.send(x)  # and pass it to the writer
        except StopIteration:
            pass
```

或者，我们可以这样做:

```Python
def writer_wrapper(coro):
    yield from coro
```

这节省了6行代码，而且使得代码更加清晰易读，最关键的是，它可行！

#### 使用`yield from`向生成器发送数据——异常处理
让我们使这个例子更复杂点，假设我们的`writer`需要处理异常呢？比如`writer`捕获`SpamException`异常并且在遇到这个的时候打印`***`。

```Python
class SpamException(Exception):
    pass

def writer():
    while True:
        try:
            w = (yield)
        except SpamException:
            print('***')
        else:
            print('>> ', w)
```

如果我们使用原始版本的`writer_wrapper`，会怎样？

```Python
# writer_wrapper same as above

w = writer()
wrap = writer_wrapper(w)
wrap.send(None)  # "prime" the coroutine
for i in [0, 1, 2, 'spam', 4]:
    if i == 'spam':
        wrap.throw(SpamException)
    else:
        wrap.send(i)

# Expected Result
>>  0
>>  1
>>  2
***
>>  4

# Actual Result
>>  0
>>  1
>>  2
Traceback (most recent call last):
  ... redacted ...
  File ... in writer_wrapper
    x = (yield)
__main__.SpamException
```

不能正常工作的原因是因为`x = (yield)`抛出了这个异常所以导致了程序崩溃。要使得其正常工作的话，我们需要亲自捕获异常并将它传递给子生成器(`writer`)：

```Python
def writer_wrapper(coro):
    """Works. Manually catches exceptions and throws them"""
    coro.send(None)  # prime the coro
    while True:
        try:
            try:
                x = (yield)
            except Exception as e:   # This catches the SpamException
                coro.throw(e)
            else:
                coro.send(x)
        except StopIteration:
            pass

...
# Result
>>  0
>>  1
>>  2
***
>>  4
```

这可以正常工作，但是假设我们这样呢:

```Python
def writer_wrapper(coro):
    yield from coro
```

`yield from`语句透明地将数据或者异常发送给子生成器。

以上仍然没有覆盖所有的特殊情况。如果外部生成器关闭了会怎样？子生成器返回了一个值会怎样(Python 3里生成器可以返回值)？返回值会怎样被处理？而`yield from`很好的处理了以上所有情况。

#### 总结
<div class="tip">
`yield from`是**调用者**和**子生成器**之间的一个**双向透明通道**。
</div>

更多关于`yield from`的内容可以阅读[PEP 380 -- Syntax for Delegating to a Subgenerator](https://www.python.org/dev/peps/pep-0380/)。
