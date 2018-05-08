---
title: Google三架马车之GFS
tags:
  - 系统设计
  - 分布式
  - 可靠性
category: 系统架构
date: 2018-05-08 11:25:52
categories:
---


Google在本世纪前10年里提出了很多关键性的技术，对后来的很多领域、技术或公司产生了深刻的影响，今天我想分享的是从论文以及网上博文了解的谷歌大数据的一个基石——GFS(Google File System)。

人们经常将GFS、BigTable和MapReduce称为谷歌的三架马车，因为这三项技术分别从文件系统、数据模型、算法层面为大数据提供了完整的解决方案，因此在整个大数据的发展历程中占有很重要的地位。

<!-- more -->

# 文件的保存

如果对LInux系统有一些了解，就会知道Linux系统保存文件采用inode的方式，简单理解就是每个文件拥有一些元信息(Metadata)，这些信息保存了例如文件名、文件类型、文件大小、创建时间和修改时间等等信息，以及一个索引表，用来指示该文件的各个块在硬盘上的位置，如下图所示。

![](inode.png)

因为Block是分配的最小单位，因此通常每个Block的大小都不会太大，因为如果太大的话，有一些小文件将占据一个Block的很少一部分，但是其他文件却无法再使用这部分没有利用的空间，以我手边的Ubuntu Kylin 16.04 LTS为例，其Block size是**4KB**，这样可以保证空间不被大量小文件浪费。

但是Block size是否是越小越好呢？答案是**否**。理论上越小的Block将更加有效地利用磁盘空间，但是将会大大增加索引的个数以及元数据的大小。

与此同时，4KB的Block对于大文件来说效率也不是很适合。因此我们可以采用更大的Block，比如64MB的Block，也即GFS中的Chunk。

**Chunk优点：**

1. 减少了元数据的大小，以1KB的Block为例， 1 Chunk = 64MB = 64 x 1024 KB = 65536 Blocks
2. 减少网络传输文件元数据的流量

**Chunk缺点：**

1. 小文件会浪费空间

# GFS基础

以上的讨论都是在一台机器上的存储，但是在实际使用中，出于各种考虑（单机容量大小、系统吞吐量、容错性），我们通常会选择分布式存储，GFS提出了完整的分布式解决方案。

## Master和Chunk Server

在GFS中，我们会将一个超大的文件分成很多个Chunk然后分别存放到很多台**Chunk Server**，然后将该文件的元数据（文件名、大小、索引）保存到一台专门的服务器**Master**上，跟单机场景下没有太大区别，只不过此时的索引不只保存磁盘偏移量，还保存了在哪台Chunk Server上，这样我们知道在哪台Chunk Server上，而且知道其偏移量，那么就能找到该Chunk，如下图所示。

![](GFS_master_meta_cs_offset.png)

如果仔细思考整个结构，会发现一个问题，那就是在Master上保存了Chunk Server上的偏移量，那么每次Chunk Server上Chunk的位置有了变化都需要通知Master更改，这样加重了Master的负担以及网络流量。

那么根据高内聚-低耦合的设计思想，我们考虑将偏移量的保存交由Chunk Server，Master只保存某个Chunk存在于某个Chunk Server这一信息，如下图所示。

![](GFS_master_meta_cs.png)

## 数据完整性

我们已经能够存储下超大文件了，但是对于存储，我们无法要求其不出现一点错误，那么如果遇到了数据损坏我们怎么检测呢？在GFS中，采用了将每个Chunk划分成64KB的Blocks并逐个计算32bit的校验和的方式，带来的额外的存储开销约为文件总大小的$ 6.1\times10^{-5} $，对于一个1TB的文件，其checksum的存储开销只有64MB大小，这样我们可以很方便的检验一个Chunk是否是损坏的。

## 可用性

另一个要解决的问题就是如果保证可用性，服务器宕机的情况可能发生，那么很简单的一个处理方式就是将同一个Chunk复制到多个Chunk Server，那么应该复制到几个Chunk Server呢？一般来说是3，也就是2+1的模式，复制到两个数据中心，其中一个数据中心保存两份副本，一个数据中心保存一份副本。保存两份副本的数据中心将数据分散了两个不同机架上。那么应该保存到哪台Chunk Server呢？一般来说会选择硬盘利用率低的Chunk Server，但要注意避免都写到一台Chunk Server上，因为一个新的机器拥有较低的硬盘利用率，如果不控制写到同一台Chunk Server上，可能带来热点数据的问题。考虑可用性后的架构如下图所示。

![](GFS_high_availability.png)


## 损坏Chunk的恢复

我们已经可以通过checksum判断一个Chunk是否损坏，同时一个Chunk会被复制到多个Chunk Server上，那么如果一台Chunk Server上的某个Chunk损坏了应该怎么恢复呢？步骤很简单：

1. 向Master请求咨询拥有该Chunk的Chunk Server
2. 根据Master的回复联系拥有该Chunk的Chunk Server索要Chunk
3. 接收来自Chunk Server的数据恢复自身Chunk

## Chunk Server存活检测

Chunk Server随时可能由于种种原因导致无法继续提供服务，那么Master需要有一种机制来检测Chunk Server是否存活，而这一机制就是**心跳包**。Chunk Server会定时向Master汇报，而Master会存储这一时间，当长时间没有得到来自Chunk Server的心跳包后，我们可以认为Chunk Server已经挂掉了。

## Chunk恢复

前一节讲到了Chunk Server可能挂掉，那么在Master上这些Chunk对应的该Chunk Server就无法使用，那么为了保证可用性，我们需要启动一个修复进程来将这些Chunk复制到其他Chunk Server上，同时，恢复优先级将会根据该Chunk剩余Chunk Server数量来排序，存活副本越少，就越应该尽早修复。

## 热点数据的处理

应对热点数据的处理方式很简单，我们只需要一个热点平衡进程，该进程会追踪每个Chunk的访问热度以及每个Chunk Server的剩余空间、带宽等信息，当某个Chunk成为热点数据时，我们根据剩余空间以及带宽等信息来将该Chunk复制到更多Chunk Server即可。

# GFS使用

## 读文件

![](GFS_read.png)

如论文中的图所示，GFS整个读过程是十分简洁的。

**读文件步骤如下：**

1. GFS client向GFS master请求某个文件的某个Chunk的元数据
2. GFS master会找到该文件的元数据，并返回该Chunk的对应的一个64bit全局唯一*handle*，以及其副本所在的Chunk Server的信息，客户端将会在一定时间内缓存这些信息
3. GFS client将向某个Chunk Server发出请求，很可能是最近的一个。该请求将会指明*handle*以及该Chunk中的某个地址范围
4. Chunk Server根据请求返回对应的数据

执行了上述过程之后，接下来对同一Chunk的读取操作将不需要跟GFS master进行通信，直到缓存过期。

## 写文件

![](GFS_write.png)

GFS的写入过程如上图所示。

**写文件步骤如下：**

1. GFS client向GFS master请求某个文件的某个Chunk的元数据
2. GFS master返回副本所在Chunk Server的信息，并指明为primary的Chunk Server和为Secondary的Chunk Server，客户端将会缓存这些信息
3. GFS client将会将数据推送至这些Chunk Server，Chunk Server将会把这些数据先缓存起来而不执行立即写入。假设有S1-S4一共4个Chunk Server，具体做法是GFS client选择一个最近的Chunk Server，以S1为例，然后将数据推送至该S1，然后S1将会将数据推送至最近的一个Chunk Server，如S2，依此类推，client -> S1 -> S2 -> S3 -> S4
4. 当所有Chunk Server完成了数据的缓存，GFS client将会向Primary发出写入请求，该请求将会指明先前推送到服务器的数据。Primary将会将来自多个clients的修改请求序列化，按照先后顺序修改本地的存储状态
5. Primary将写入请求转发至所有Secondary，也按照先后顺序执行写入
6. Secondary在完成操作后向Primary发出回复
7. Primary向client发出回复。在任意Chunk Server上发生的错误都将报告给client，因此写入可能在任意数量Chunk Server上完成（如果在Primary上发生错误，将不会转发写入请求）

我们可以看出，写入的过程较读来说稍微复杂一些，但是仍然是比较简洁的。需要注意的是，写入过程中出现错误将有client来处理，而不是服务器，因为引入错误处理机制可能会带来更多的错误，因此如果出现了错误，让客户端执行重试等操作。

# 参考文献

* [系统设计高频：设计分布式文件系统Google File System](http://blog.bittiger.io/post174/)
* [The Google File System](https://dl.acm.org/citation.cfm?id=945450)
