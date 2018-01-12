---
title: 初窥asyncio
date: 2017-05-10 14:10:06
tags: [Python,asyncio,协程]
categories: Python
---
前两天花了些时间阅读了Python的[`asyncio`](https://docs.python.org/3/library/asyncio.html#module-asyncio)模块的相关文档，综合之前对[Twisted](http://twistedmatrix.com/trac/)的一些了解，分享一些学习结果。

根据官方文档的介绍，`asyncio`这个模块是在Python 3.4进行引入的，这个模块提供了使用协程编写单线程并发程序、对sockets以及其他资源的多路I/O访问、执行网络客户端和服务器等工作的基础。模块内容主要包含:

* 一个多种平台相关实现的可插拔事件循环；
* `transport`和`protocol`抽象(与[Twisted](http://twistedmatrix.com/trac/)的概念相似)；
* 对TCP、UDP、SSL、子进程管道、延迟调用、以及其他功能(以上操作可能平台相关)的有力支持；
* 一个模仿[`concurrent.futures`](https://docs.python.org/3/library/concurrent.futures.html#module-concurrent.futures)模块实现的`Future`类，但增加了对事件循环的适应；
* 使用[`yield from`](https://www.python.org/dev/peps/pep-0380)的协程(coroutines)以及作业(tasks)，以帮助使用顺序方式编写并发代码；
* 对取消`Future`和协程的支持；
* 在单线程的不同协程中使用的[同步原语](https://docs.python.org/3/library/asyncio-sync.html#asyncio-sync)，模仿[threading](https://docs.python.org/3/library/threading.html#module-threading)实现；
* 一个向线程池传递任务的接口，以解决无可避免地需要使用某些会造成I/O阻塞库的调用。

<div class="tip">本文相关特性需Python 3.4以上版本支持，部分内容需要Python 3.5以上版本支持</div>

<!-- more -->

在开始相关的介绍之前，我们需要对同步、异步等工作方式有一个简单的了解，以下部分内容引用自[*krondo*](http://krondo.com)编写的[Twisted Introduction](http://krondo.com/an-introduction-to-asynchronous-programming-and-twisted/)。

# 同步与异步

大部分程序员应该非常熟悉同步模型了：

![](sync.png)

这是最简单的一种编程方式，每个任务依次执行，只有上一个任务结束以后下一个才会执行，任务都是按照确定顺序执行的，后面的任务可以认为所有之前的任务都是没有错误的正常结束，且他们的输出可以正常使用。

当然，我们也可以对比多线程(同步)模型：

![](threaded.png)

在该模型中，每一个任务都在一个单独的线程中执行，线程由操作系统管理，且在某些拥有多处理器或多核的操作系统上，可能可以真正的并发执行，或者都被放入同一处理器中执行。关键在于，多线程模型的执行细节是由操作系统控制的，对于不相关的指令流程序员应该认为其是同时执行的。因此，虽然图看起来简单，但实际编写多线程模型可能比较复杂，因为不同线程之间需要保持一定的协调。线程通信以及协调是一个高级编程话题而且要正确实现很困难。

下面让我们来看异步模型：

![](async.png)

在该模型中，任务之间彼此交错，但是都在同一线程中执行。这比多线程的情况要简单因为程序要总是知道**同一时间只有一个任务在执行**。除此之外，异步模型与多线程模型之前还有一个区别，在多线程模型中，线程的挂起与执行是由操作系统而不是程序员决定的，程序员需要假设一个线程可能被随时挂起。与此相反，在异步模型中，一个任务将会持续运行直到在适当的时候明确主动地放弃CPU资源占用让其他任务执行，这比多线程模型简单许多。

# 为什么要使用异步模型

有很多原因促使我们使用异步模型，其中一个比较常见的就是解决阻塞问题：

![](block.png)

图中的灰色部分代表了一个任务正在阻塞等待而无法继续执行。为什么一个任务会阻塞？一个常见的原因就是该任务正在等待完成I/O，完成向外接设备传递数据或者从外界设备接收数据。通常情况下，由于CPU处理数据的速度是磁盘或者网络连接处理数据速度的几个数量级，因此一个完成大量I/O操作的程序将会在阻塞上大量时间以等待磁盘或者网络完成操作。回过头看异步模型，对于遇到一个任务可能在同步模型下阻塞的时候，将会让出CPU转而执行其他没有阻塞的任务。因此异步模型只在没有任务可以继续执行即所有任务都在等待I/O的时候“阻塞”。

相比较于同步模型，异步模型在以下情况下表现更好：

1. 有大量任务需要执行且无论什么时候至少有一个任务可以继续执行。
2. 要完成的任务中需要完成大量I/O操作，导致同步程序在其他任务可以继续执行时候会浪费大量时间阻塞等待。
3. 任务之间基本不相关因此不需要任务间交互。

那么asyncio的异步模型实现是基于什么呢？

![](reactor-1.png)

如图所示，这是反应器模式的一个基本结构，它总是处在等待事件以及处理事件的状态之一，因此也被称作**事件循环(event loop)**，也即asyncio模块的核心之一。

# 事件循环示例

让我们从一些官方文档示例开始。

第一个例子是简单地打印字符串：

```Python
import asyncio

def hello_world(loop):
    print('Hello World')
    loop.stop()

loop = asyncio.get_event_loop()

# Schedule a call to hello_world()
loop.call_soon(hello_world, loop)

# Blocking call interrupted by loop.stop()
loop.run_forever()
loop.close()
```

代码首先导入了我们需要使用的asyncio模块，然后定义了一个接收一个参数的`hello_world`函数，该函数只完成了两件事，打印一段字符串并在一个对象上调用了`stop`方法，关键在这之后：

1. `get_event_loop`: 我们通过使用asyncio模块的`get_event_loop`方法取得了事件循环，之前说过了，事件循环是整个asyncio模块的核心，我们需要把我们的任务添加到事件循环中，那么第一步便是取得事件循环。除了取得事件循环，还可以更改或者新建事件循环，以及更底层的Policy，但是由于我们是初次接触，就不再深究。
2. `call_soon`: 接着，我们在loop对象上调用了`call_soon`方法，该方法接收多个参数，第一个参数是一个可调用对象，后面的参数将会传给该对象，在此处我们传递了`hello_world`函数和loop对象。该函数的作用是在事件循环启动之后尽快调用传递的对象。
3. `run_forever`: 通过调用loop对象的`run_forever`函数，将启动事件循环，外部代码将会阻塞，即`run_forever`之后的函数将不会继续执行。
4. `stop`: 由于启动了事件循环，之前通过`call_soon`调度的`hello_world`函数将会执行，打印字符串并调用loop对象的`stop`方法，该方法将会停止事件循环，使得外部代码继续执行。
5. `close`: 关闭事件循环，需要注意的是关闭之前必须保证事件循环没有执行。

第二个例子每秒打印一次当前日期时间：

```Python
import asyncio
import datetime

def display_date(end_time, loop):
    print(datetime.datetime.now())
    if (loop.time() + 1.0) < end_time:
        loop.call_later(1, display_date, end_time, loop)
    else:
        loop.stop()

loop = asyncio.get_event_loop()

# Schedule the first call to display_date()
end_time = loop.time() + 5.0
loop.call_soon(display_date, end_time, loop)

# Blocking call interrupted by loop.stop()
loop.run_forever()
loop.close()
```

`call_soon`和`run_forever`等方法的调用和前一个例子相同，区别在于调用`display_date`函数将会打印当前日期时间然后判断当前时间是否超过结束时间，如果超过则停止事件循环，否则则使用`call_later`方法设置1秒后对`display_date`函数进行调用。需要注意的一点是loop的`time`方法和`time`模块的`time`方法相似，不过使用的loop的内部时钟。

第三个例子是监视文件描述符的读事件：

```Python
import asyncio
try:
    from socket import socketpair
except ImportError:
    from asyncio.windows_utils import socketpair

# Create a pair of connected file descriptors
rsock, wsock = socketpair()
loop = asyncio.get_event_loop()

def reader():
    data = rsock.recv(100)
    print("Received:", data.decode())
    # We are done: unregister the file descriptor
    loop.remove_reader(rsock)
    # Stop the event loop
    loop.stop()

# Register the file descriptor for read event
loop.add_reader(rsock, reader)

# Simulate the reception of data from the network
loop.call_soon(wsock.send, 'abc'.encode())

# Run the event loop
loop.run_forever()

# We are done, close sockets and the event loop
rsock.close()
wsock.close()
loop.close()
```

该示例通过使用socketpair函数创建了一组相连接的socket对象，`loop.call_soon(wsock.send, 'abc'.encode())`将会在事件循环启动后尽快调用wsock的`send`方法，方法参数为`'abc'.encode()`。除此之外，通过调用loop的`add_reader`方法，监视rsock的读事件，当读可用时，将会调用注册的`reader`函数，接收内容并打印出来，然后取消对rsock的注册并停止事件循环。

最后一个例子是为`SIGINT`和`SIGTERM`等信号设置处理器：

```Python
import asyncio
import functools
import os
import signal

def ask_exit(signame):
    print("got signal %s: exit" % signame)
    loop.stop()

loop = asyncio.get_event_loop()
for signame in ('SIGINT', 'SIGTERM'):
    loop.add_signal_handler(getattr(signal, signame),
                            functools.partial(ask_exit, signame))

print("Event loop running forever, press Ctrl+C to interrupt.")
print("pid %s: send SIGINT or SIGTERM to exit." % os.getpid())
try:
    loop.run_forever()
finally:
    loop.close()
```

上面一段代码里面最重要的部分就是`add_signal_handler`方法，第一个参数为信号对象，第二个参数为该信号出现时该调用的函数。在本例中，即当`SIGINT`和`SIGTERM`信号出现时调用`ask_exit`函数。

在使用asyncio时，还有一点需要注意的是：

> 许多asyncio模块的函数都不接受关键字参数。因此，如果需要向回调函数传递关键字参数，需要使用`functools`模块的`partial`方法，比如`loop.call_soon(functools.partial(print, "Hello", flush=True))`将会调用`print("Hello", flush=True)`。

限于篇幅原因，本文止步于此，对于asyncio模块的其他内容的学习在接下来的文章中会进行分享。
