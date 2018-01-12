---
layout: post
title: multiprocessing中pool实现
tags: [Python,多进程,进程池]
category: Python
date: 2017-01-17 08:52
---

终于有时间来整理整理之前自己的一些心得，今天想分享的是之前梳理的`Python`中`multiprocessing`模块的线程池与进程池实现。

<!-- more -->

multiprocessing.pool类包含taskqueue、inqueue、outqueue三个队列，其中：

* taskqueue采用`Queue.Queue`实现，通过apply、apply_async、map、map_async等函数向pool类提交任务。
* inqueue、outqueue采用`SimpleQueue`实现，本质上是带锁的pipe
* inqueue负责存放待完成任务，outqueue负责存放已完成任务

multiprocessing.pool类包含worker_handler、task_handler、result_handler三个handler，均在threading.Thread上工作，均为`Daemon Thread`，其中：

* worker_handler负责回收已经完成任务的worker，同时根据回收数量使用process函数重新生成足够的worker，在生命周期中维护整个pool中worker的数量:
```python
    def _maintain_pool(self):
        """Clean up any exited workers and start replacements for them.
        """
        if self._join_exited_workers():
            self._repopulate_pool()

    @staticmethod
    def _handle_workers(pool):
        thread = threading.current_thread()

        # Keep maintaining workers until the cache gets drained, unless the pool
        # is terminated.
        while thread._state == RUN or (pool._cache and thread._state != TERMINATE):
            pool._maintain_pool()
            time.sleep(0.1)
        # send sentinel to stop workers
        pool._taskqueue.put(None)
        util.debug('worker handler exiting')

```
* task_handler负责从taskqueue中按先后顺序阻塞获取待完成任务，更新pool的任务cache，并提交至inqueue中等待worker处理
* result_handler负责从outqueue中按先后顺序阻塞获取已完成任务，更新pool的任务cache，如果存在回调函数则进行回调操作

multiprocessing.pool类包含1个(未实现情况下)或多个(未提供数量，cpu_count()个)或指定数量的worker，其中：

* worker的维护由worker_handerler负责，在一个worker任务完成后由worker_handler负责回收并重新生成新的worker
* worker包含对inqueue.get和outqueue.put的引用
* worker从inqueue从获取待完成任务，并负责执行该任务，并将执行结果提交至outqueue中等待处理:
```python
def worker(inqueue, outqueue, initializer=None, initargs=(), maxtasks=None,
           wrap_exception=False):
    assert maxtasks is None or (type(maxtasks) == int and maxtasks > 0)
    put = outqueue.put
    get = inqueue.get
    if hasattr(inqueue, '_writer'):
        inqueue._writer.close()
        outqueue._reader.close()

    if initializer is not None:
        initializer(*initargs)

    completed = 0
    while maxtasks is None or (maxtasks and completed < maxtasks):
        try:
            task = get()
        except (EOFError, OSError):
            util.debug('worker got EOFError or OSError -- exiting')
            break

        if task is None:
            util.debug('worker got sentinel -- exiting')
            break

        job, i, func, args, kwds = task
        try:
            result = (True, func(*args, **kwds))
        except Exception as e:
            if wrap_exception:
                e = ExceptionWithTraceback(e, e.__traceback__)
            result = (False, e)
        try:
            put((job, i, result))
        except Exception as e:
            wrapped = MaybeEncodingError(e, result[1])
            util.debug("Possible encoding error while sending result: %s" % (
                wrapped))
            put((job, i, (False, wrapped)))
        completed += 1
    util.debug('worker exiting after %d tasks' % completed)

```

PS：
> multiprocessing.ThreadPool是pool的thread-level级实现，以multiprocessing.dummy中的DummyProcess替换了pool的默认process，DummyProcess继承至threading.Thread，因此ThreadPool的实现是thread-level级的。

实现用图来表示如下:

![multiprocessing_pool](python_multiprocessing_pool.png)