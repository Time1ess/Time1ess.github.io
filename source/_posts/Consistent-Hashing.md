---
title: 浅谈分布式缓存与一致性哈希算法
date: 2018-04-22 09:26:43
tags: [哈希算法, 分布式, 缓存]
categories: 系统架构
---

之前听到过一致性哈希算法，但是没有去进行了解。恰逢最近在看系统设计方面的内容，看到设计缓存系统的部分，对于如何合理有效地分配缓存而使用的一致性哈希算法进行了一些了解。

<!-- more -->

# 缓存

缓存是目前各种应用中广泛使用的技术，比如DNS、Web服务器缓存等，是一种以空间换时间的方式。

常见的缓存算法有很多，LRU（最久未使用)、LFU（最近最少使用）等等。下面简单介绍一下LRU算法。

一个缓存算法应该支持这些操作：插入、删除、查找。对于LRU，为了实现快速查找，我们需要使用到哈希表，另外由于我们需要根据使用情况，快速调整一个对象的位置，那么我们很容易能想到使用链表来实现，同时由于需要从链表中删除一个对象后保证链表连接，因此我们需要使用到双向链表。

LRU的工作流程如下：

* 查找：给定一个键(key)，从LRU缓存中查询结果
	* 若该键存在于哈希表中：从哈希表中获取该键对应的值以及在双向链表中的位置，从双向链表中删除该键并调整前后结点的连接，将该键重新插入到链表头部，返回值。
	* 若该键不存在于哈希表中：直接返回告知调用者该键不存在。
* 插入：给定一个键值对(key-val)，加入LRU缓存
	* 若该键存在于哈希表中：从哈希表中获取键在双向链表中的位置，从双向链表中删除该键并调整前后结点的连接，将该键重新插入到链表头部，更新哈希表中键对应的值。
	* 若该键不存在于哈希表中：（若LRU已满，获得链表最后一个结点的键，删除该结点以及其对应的哈希表的内容）将该键插入到链表头部，在哈希表中保存键对应的值以及链表位置。
* 删除：给定一个键，从LRU缓存中删除
	* 若该键存在于哈希表中：从哈希表中获取键在双向链表中的位置，从双向链表中删除该键并调整前后结点的连接，从哈希表中删除该键。
	* 若该键不存在于哈希表中：直接返回。

# 缓存并发性

当多个客户端同时尝试更新缓存时，可能会发生读写冲突。例如两个客户端可能竞争相同的缓存槽，而最后一个更新缓存的客户端将获胜。要解决读写冲突，常见的方法就是使用锁，但是使用锁将带来严重的性能影响，那么如何优化呢？

一种方法是缓存分成多个分片，为每个分片分配一个锁，这样客户端在理想情况下会更新不同分片的缓存，就不用再相互等待。但是在极端情况下，仍然无法避免竞争的问题。

另一种方法是使用提交日志。所有的改动被存储到一个日志中，而不是立即对缓存进行更新。一些后台进程将异步执行日志来更新缓存。这一策略在数据库设计中经常使用。

# 分布式缓存

当我们的系统达到一定的规模时，我们需要将缓存分配给多台机器。假设我们有M台服务器以及N张图片需要缓存，我们希望通过3台服务器来缓存这N张图片，平衡服务器负载压力。

## 随机分配

考虑最简单的情况，我们直接将这N张图片随机分给M台服务器，每台分得N/M张图片，在这种情况下，如果我们想访问某个缓存项，我们需要遍历M台服务器去找到该缓存项，然而缓存的目的是为了提高速度，改善用户体验，减轻后端服务器压力，如果每次访问都需要遍历所有服务器，那么该缓存是很失败的。

## 哈希表

我们还可以在一台服务器上保存一张哈希表，这张哈希表能帮助我们找到某个缓存项在哪一台服务器上。这样做的好处是现在我们只需要访问2台服务器就能得到所需要的缓存项，但是缺点是使用了大量的空间来维护哈希表。

## 取模运算

常见的一种操作是对缓存项的键进行哈希计算，然后将hash之后的结果对服务器的数量进行取模运算，根据该结果来确定缓存会在哪一台服务器上。

$$ idx = hash(pic\\_name) \pmod{N} $$

举例说明，有10条数据，3个结点，如果按照取模的方式，那么缓存的分配情况将会是：

* Node A: 0, 3, 6, 9
* Node B: 1, 4, 7
* Node C: 2, 5, 8

但是使用这种方法进行缓存时会有一些缺陷，如果3台缓存服务器不够用了我们应该怎么做呢？没错，增加额外的结点，我们考虑再增加一台服务器，此时分配情况将会变为：

* Node A: 0, 4, 8
* Node B: 1, 5, 9
* Node C: 2, 6
* Node D: 3, 7

通过观察可以发现，数据3, 4, 5, 6, 7, 8, 9在增加结点之后，都被重新分配了位置，这一成本实在是太高，而在重新分配位置这一期间，缓存这段时间内是失效的，因此如果有客户端请求数据，应用将不得不向后端服务器请求。由于大量缓存同时失效，造成缓存雪崩，整个系统可能会被压垮，所以我们要避免这种情况的发生。

# 一致性哈希算法

我们在前文谈到了采用普通哈希算法会出现的问题。

1. 当缓存服务器数量变化时，会引起缓存雪崩，可能导致系统崩溃。
2. 当缓存服务器数量变化时，几乎所有缓存位置都会发生改变。

其实第一个问题主要来源于第二个问题，因此我们只要能保证在缓存服务器数量变化时，尽量维持缓存的位置即可。因此在[Karger](https://zh.wikipedia.org/w/index.php?title=David_Karger&action=edit&redlink=1)等人1997年的一篇论文中介绍了“一致哈希”如何应用于用户易变的分布式Web服务中。哈希表中的每一个代表分布式系统中一个节点，在系统添加或删除节点只需要移动N/M项。

## 过程

一致性哈希算法也是取模的过程，不过不同于对服务器数量进行取模，一致性哈希是对$ 2^{32} $取模。

我们可以想象一个环，这个环上面一共有$ 2^{32} $个点，顺时针从0开始计数: 0, 1, 2, ..., $ 2^{32} - 1 $，我们将该环称作哈希环，如下图所示。

![hash_ring.png](hash_ring.png)

对于我们已有的3台缓存服务器，我们通常对其IP地址进行哈希计算然后对$ 2^{32} $取模，得到一个$ 0 $到$ 2^{32} - 1 $之间的数，该数即服务器在环上位置，这样，我们能得到3台服务器在环上的位置，如下图所示。

$$ idx = hash(server\\_ip) \pmod{2^{32}} $$

![servers_on_hash_ring.png](servers_on_hash_ring.png)

同样道理，我们将需要缓存的对象也映射到哈希环上，可以使用图片名称来进行哈希。

$$ idx = hash(pic\\_name) \pmod{2^{32}} $$

![pic_on_hash_ring.png](pic_on_hash_ring.png)

现在服务器与缓存项都被映射到了哈希环上，我们最后需要决定缓存项被分配到哪一台服务器上，通常做法是沿着顺时针方向找到的第一台服务器就是缓存项应在的服务器，在本例中缓存项应被分配到服务器A上。

![pic_belong.png](pic_belong.png)

## 优点

那么我们使用了一致性哈希算法后解决了缓存雪崩的问题了吗？

考虑多个缓存项已经完成分配的情况下，服务器B出现了故障，如下图所示。

![pics_on_hash_ring.png](pics_on_hash_ring.png)

当我们失去服务器B以后，只需要移动两个缓存项，而不是近乎所有缓存项。

## 哈希环偏斜

在前面的论述中，我们理想地将3台服务器划分的很均匀，但是实际情况可能差得多，如下图所示。

![bias_on_hash_ring.png](bias_on_hash_ring.png)

在这种情况下，几乎所有的缓存项将被分配到服务器C，而A和B将会分得很少，一致性哈希算法提出了“虚拟结点”这一概念来解决这一问题。

## 虚拟结点

这一概念其实很简单，在增加一个结点到环上的时候，我们会为其分配多个位置（因为实际结点只有一个，因此多出来的结点就称为虚拟结点）。引入虚拟结点之后，缓存的分布就均衡多了，如下图所示。

![virtual_nodes_on_hash_ring.png](virtual_nodes_on_hash_ring.png)

## 实验

通过编写相关代码，我模拟了拥有在5个服务器，每个服务器拥有150个结点的情况下，对100000个缓存项进行一致性哈希分配的过程，结果如下表所示。

|服务器IP|缓存项数量|
|:--:|:--:|
|192.168.1.5|20216|
|192.168.1.39|21106|
|192.168.1.53|17599|
|192.168.1.66|19560|
|192.168.1.127|21519|

可以看出，使用一致性哈希算法之后，每个服务器能够被比较均匀的分配到缓存项，同时如果增加或删除服务器，需要迁移的缓存项数量也基本符合N/M这一数量。

有兴趣的读者可以参考我的实现代码[Github](https://github.com/Time1ess/MyProjects/tree/master/ConsistentHashRing)。

# 参考文献

* https://wizardforcel.gitbooks.io/gainlo-interview-guide/content/sd11.html
* https://blog.csdn.net/gerryke/article/details/53939212
* http://www.zsythink.net/archives/1182
* https://zh.wikipedia.org/wiki/一致哈希