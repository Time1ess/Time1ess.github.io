---
title: 论文笔记-全卷积神经网络(FCN)
date: 2017-07-25 10:50:05
tags: [Semantic Segmentation, Deep Learning, CNN]
categories: 语义分割
---

看了下时间已经快3个月没有写过东西了，客观原因是考试复习和项目上的事情比较多，主观原因是懒。

最早接触机器学习是在大三，大四的时候了解了一些DL的知识，前几个月在网上学习了斯坦福的[CS231n: Convolutional Neural Networks for Visual Recognition](http://cs231n.stanford.edu)，看了一些论文，对DL相关概念有了一些基本的了解，这篇文章是我阅读[Fully Convolutional Networks for Semantic Segmentation](https://arxiv.org/abs/1411.4038v2)时的一些理解。

<!-- more -->

# Sementic Segmentation(语义分割)

语义分割是计算机视觉领域的一个经典问题，它所要完成的工作是对于图片的每一个像素，对其赋予一个标签，这和分类(Classification)、定位(Localization)等任务有很大的区别，分类是完成判断“是什么”的任务，定位不仅需要判断“是什么”，还需要完成“在哪里”的任务。举个例子说明,对于下面这张图片:

![cat](cat.png)

对其进行语义分割，得到的结果如下图所示:

![ss-cat](ss-cat.png)

图中不同颜色代表了不同的语义，比如黄色代表了猫，绿色代表了草坪，蓝色代表了天空，粉紫色代表了猫身后的树林。

语义分割对于人工智能迈向更高台阶是十分重要的，因为这一工作能够让计算机拥有类似人的判断，对其观察到的世界进行认识了解，这一工作在机器人领域以及自动驾驶等领域有很大的应用前景。

在[Fully Convolutional Networks for Semantic Segmentation](https://arxiv.org/abs/1411.4038v2)这篇论文将深度学习引入该领域之前，传统的语义分割主要依赖使用人工提取特征和概率图模型，而FCN这篇论文的发表，成为了语义分割的一个重要转折点。

全卷积网络的概念其实很早就提出了，因此在本文获得CVPR' 15最佳论文提名的时候被Yann LeCun等人吐槽，当然，这篇论文仍然具有十分重要的意义。

# 全连接层 --> 卷积层

传统的分类网络，比如LeNet、AlexNet等，只接受固定尺寸的输入并产生非空间输出，原因在于全连接层参数的限制，而且这些网络在通过全连接层把输入展开成向量的时候丢失了图片原有的空间信息。对VGG16中第一个全连接层为25088x4096，即该层输入未展开成向量前形状为7x7x512，展开后为1x25088，得到的输出为1x4096，其实换一个角度来看，如果采用512x7x7x4096的卷积层原始输入进行卷积操作，得到的结果为1x1x4096。这样操作后，对应于原来输出的向量，现在输出了heatmap，如下图所示。

![heatmap-cat](heatmap-cat.png)

使用卷积层替换全连接层这种操作具体有什么作用呢？

以AlexNet为例，该网络输入为224x224x3，使用一系列卷积层和Pooling层使得数据尺寸变为7x7x512，紧接着是三个4096、4096、1000的全连接层，我们将三个全连接层分别转化为三个卷积层:

* 对第一个全连接层25088x4096，我们可以使用kernel_size为7的4096个卷积核代替，这样得到的输出为1x1x4096
* 对第二个全连接层4096x4096，使用kernel_size为1的4096个卷积核代替，得到输出为1x1x4096
* 对第三个全连接层4096x1000，使用kernel_size为1的1000个卷积核代替，得到输出为1x1x1000

假如我们想对384x384x3的图片进行语义分割，在不使用卷积层替换全连接层的情况下，我们使用步长为32大小为224x224x3的窗口在384x384x3的图片上进行滑动，得到6x6个位置的语义分割得分，然后进行fusion处理。但是因为我们使用了卷积层替换全连接层，现在的网络有能力对不同尺寸的输入进行处理。因此，384x384x3的输入经过卷积层和Pooling层后得到的尺寸为12x12x512，再通过上面经过转化的三个卷积层，得到的结果为6x6x1000，正好是对原图进行滑动得到的结果。

论文给出了这两种方式的时间性能比较，在GPU上，AlexNet需要花费1.2毫秒来产生对一张227x227的图片预测，而FCN版本花费了22毫秒对一张500x500的图片产生大小为10x10的预测，比AlexNet快了5倍多。

# Upsampling(上采样)

以改造后的VGG16为例，让输入经过网络之后，我们得到的数据尺寸为[H/32, W/32]，而我们的目标是对每一个像素产生预测，因此我们需要进行upsampling操作，即恢复原始尺寸。在某种程度上，使用系数为$f$的upsampling可以看成是步长为$1/f$的卷积的转置，即只要$f$是整数，一种进行upsampling的方法就是使用**backwards convolution**(或称**deconvolution**，该术语存在争议，也有人称**transposed convolution**)，以输出步长为$f$进行计算。

![padding_strides](padding_strides.gif)

如图所示，绿色部分为输入，蓝色部分为输出，stride为2，padding为1。可以看出，**transposed convolution**其实就是**convolution**反过来，调换了**convolution**的前向传播和反向传播过程而已。

# Architecture

以VGG16和PASCAL数据集为例，我们去除了最后的分类层，并将所有的全连接层转化为上述的卷积层，然后添加了一层1x1x21的卷积层用于预测每个类别(包括背景)的得分，然后使用转置卷积进行双线性上采样，使得粗粒度输出(coarse outputs)变成像素密集的输出。

虽然可以通过fine-tune来优化分割结果，得分也会变高，但是这些输出仍然比较粗糙无法令人满意。最后的prediction层采用stride为32的方式限制了上采样结果的细节程度。那么怎么处理这一问题呢？

我们知道，随着卷积神经网络层数的增加，每一层的感知野(reception field)也更广，而网络结构中越低的层感知野越小，因此能得到更多细节。结合低层与高层输出可以使得模型在全局结构下进行局部预测。

![fine-coarse](fine-coarse.png)

图中所示为改造后的VGG16的简化图，图中只包含了输入层、由全连接层转化而来的卷积层以及Pooling层。对我们最初采用stride为32的上采样得到结果的模型我们称为FCN-32s，为了进一步优化输出预测。我们首先在pool4后面添加1x1的卷积层来产生额外的预测。然后对使用步长为32的conv7(卷积化后的fc7)进行2x上采样，因为pool5将尺寸缩减了一半，此时进行2x上采样将会把尺寸恢复到跟pool4一样，然后把该结果和pool4后1x1卷积层产生的结果进行求和(不采用Max fusion的原因是会因为梯度选择而使得训练较为困难)。对于pool4后的1x1卷积层采用双线性插值初始化，但是允许参数在训练过程中进行调整。最后，将得到结果采用stride为16的方式进行上采样得到结果，该模型我们成为FCN-16s。同理，我们可以通过在pool3后添加1x1的卷积层并进行上述类似操作得到FCN-8s，但是得到的提升已经十分有限，因此不再进行更低层的fusion操作。

![finer-fcns](finer-fcns.png)

图中可以看出，通过融合使用不同stride的层得到的结果提高了分割的细节。

![fcns-validation](fcns-validation.png)

# 训练细节

* SGD with momentum 0.9
* Minibatch size of 20 images
* Fixed learning rates of $10^{-3}$, $10^{-4}$, $10^{-5}$ for FCN-AlexNet, FCN-VGG16, FCN-GoogLeNet
* Weight decay of $5^{-4}$ or $2^{-4}$
* Doubled the learning rates for biases(非必要)
* Zero-initialize the class scoring convolution layer
* Dropout

# 模型效果

![resluts](results.png)

# 参考文献
* [全卷积网络 FCN 详解](http://www.cnblogs.com/gujianhan/p/6030639.html)
* [论文阅读笔记：Fully Convolutional Networks for Semantic Segmentation](http://blog.csdn.net/tangwei2014/article/details/46882257)
* [Convolution arithmetic](https://github.com/vdumoulin/conv_arithmetic)
* [CS231n: Convolutional Neural Networks for Visual Recognition](http://cs231n.stanford.edu)
