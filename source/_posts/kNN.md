---
title: 机器学习算法之监督学习算法KNN(K近邻)
date: 2017-10-22 22:07:40
tags: [机器学习,监督学习,KNN]
categories: 机器学习
---
今天在学院论坛里面写了关于KNN的一篇解释，顺手就转到自己博客了，毕竟这都又是3个月没更新了，感觉自己学了很多但是就是太懒，不想记下来，这个习惯还是得改改。

<!-- more -->

## Python

首先是原始代码，已经写好非核心代码，只需要补充`L1`、`L2`、`knn`三个函数。

```Python
#!/usr/bin/env python3
# coding: UTF-8
# Author: David
# Email: youchen.du@gmail.com
# Created: 2017-10-21 13:06
# Last modified: 2017-10-21 13:53
# Filename: knn.py
# Description:
import numpy as np

# ===============================================
# For reproducibility, DO NOT CHANGE THIS SECTION
np.random.seed(1111)

M1 = 500
M2 = 50
N = 1024
S = 10

train_x = S * np.random.randn(M1, N)
train_y = np.random.randint(0, 10, M1)
test_x = S * np.random.randn(M2, N)
target_l1_y = [
    4, 4, 9, 9, 6, 4, 9, 5, 3, 2, 9, 4,
    4, 8, 8, 9, 6, 6, 5, 9, 7, 1, 6, 0,
    9, 8, 9, 9, 2, 6, 2, 3, 0, 3, 0, 4,
    1, 9, 8, 2, 2, 4, 2, 1, 2, 4, 7, 3,
    1, 9]
target_l2_y = [
    5, 4, 0, 2, 6, 4, 1, 0, 3, 2, 9, 3,
    9, 1, 8, 9, 1, 0, 0, 9, 7, 1, 6, 0,
    9, 3, 9, 2, 9, 7, 2, 8, 0, 3, 4, 6,
    1, 1, 9, 6, 6, 4, 2, 9, 2, 3, 9, 6,
    1, 5]
# ==============================================


def L1(x1, x2):
    # ===================
    # TODO: Calculate the L1 distance between x1 and x2.
    # Your code goes here
    # L1 distance
    # ===================
    pass


def L2(x1, x2):
    # ===================
    # TODO: Calculate the L2 distance between x1 and x2.
    # Your code goes here
    # L2 distance
    # ===================
    pass


def knn(train_x, train_y, test_x, sim_func=None, K=10):
    assert sim_func is not None
    test_y = np.zeros(M2).astype(int)
    # TODO:
    # Instructions:
    # 1. For each sample(x1) in test_x
    # 2. Calculate similarity between each sample in train_x and x1
    # 3. Using the K nearest neighbors to vote for x1
    # 4. assign y1 to test_y[idx]
    # -----------
    # Please Note test_y is a numpy vector, For i-th example in test_x, you
    # can do like this:
    # test_y[i] = yi
    # ===================
    # Your code goes here
    # ===================
    return test_y


def accuracy(output, target):
    return np.count_nonzero(np.equal(output, target)) / len(output)


def evaluate(func, target):
    print('Evaluating with your implementation of '
          '{} distance'.format(func.__name__))
    test_y = knn(train_x, train_y, test_x, func)
    acc = accuracy(test_y, target)
    print('Accuracy: {:.2%}'.format(acc))
    if np.abs(acc - 1) < 1e-5:
        print('Conguratulations, Your implementation is correct')
    else:
        print('There are some bugs in your implementation, Please check again')
    print()


def main():
    evaluate(L1, target_l1_y)
    evaluate(L2, target_l2_y)


if __name__ == '__main__':
    main()

```

有几点需要注意(对首次接触Python的人):

* Python中以`#`开头的行都是注释，不对程序产生任何影响
* 与C不同，Python是一门解释型语言，所以大家如果执行一个`.py`文件，解释器会从上到下依次执行语句，如果`.py`文件中只包含了类似`def func(x)`的定义代码，那么执行该文件仅会定义这些函数然后退出，所以如果`.py`文件里面有需要执行的语句，比如使用`print`打印一些内容，则可以直接像这么写:

```Python
# 该段代码首先定义了一个`hello`函数，该函数接收一个参数`name`，
# 然后函数的作用是打印'hello, <name>'，最后执行`hello`函数
def hello(name):
    print('hello', name)

hello('david')
```

* 另外，直接执行一个`.py`文件时，被执行文件的`if __name__ == '__main__':`判断将会为真，在该示例中即会调用`main`函数。

以上是需要注意的几点，具体的Python的语法由于篇幅关系，不再赘述。

## KNN

KNN，即K近邻，是一个监督学习算法，算法本身并不复杂，其基本流程是:

1. 假设给定包含$ M $个样本的训练集$ X\_{train} $，每个样本包含$ N $个特征，以及对应的类别标签$ Y\_{train} $，则$ X\_{train} $可以用一个$ M \times N $的二维矩阵表示, $ Y\_{train} $可以用一个$ M \times 1 $的二维矩阵表示

$$
X\_{train} = \begin{bmatrix}
X\_1^0 & X\_1^1 &  ... &  X\_1^n \\\\
X\_2^0 & X\_2^1 &  ... &  X\_2^n \\\\
... & ... & ... & ... \\\\
X\_M^0 & X\_M^1 &  ... &  X\_M^n \\\\
\end{bmatrix}
Y\_{train} = \begin{bmatrix}
Y\_0 \\\\ Y\_1 \\\\ ... \\\\ Y\_M
\end{bmatrix}
$$

2. 对于一个需要计算的新样本$ X $，计算其类别：
    1. 计算该样本$ X $与训练集$ X\_{train} $中每个样本$ X\_i $的距离$ D\_i $(不同距离函数计算的距离不同，因此效果也会不同)
    2. 在所有距离中取距离最小的前$ K $个样本的类别标签，根据$ K $个标签中出现次数最多的标签来确定样本$ X $的标签

## 距离函数

首先我们需要定义一些距离函数来衡量两个样本特征之间的相似度，常用的有L1距离、L2距离等。

### L1 distance

假设样本$ X_1 $有$ X_1^0, X_1^1, ..., X_1^n $特征，其与样本$ X_2 $之间的L1距离可以用以下公式计算:

$$ L1(X_1, X_2) = \left|X_1^0 - X_2^0\right| + \left|X_1^1 - X_2^1\right| + ... + \left|X_1^n - X_2^n\right| $$

L1函数代码示例:

```Python
def L1(x1, x2):
    # x1和x2都是向量，x1 - x2为每个特征相减
    # np.abs为每个结果求绝对值
    # np.sum将所有绝对值求和
    return np.sum(np.abs(x1 - x2))
```

### L2 distance

L2距离即为特征差的平方求和开方，即:

$$ L2(X_1, X_2) = \sqrt{(X_1^0 -  X_2^0)^2 + (X_1^1 -  X_2^1)^2 + ... + (X_1^n -  X_2^n)^2} $$

L2函数代码示例:

```Python
def L2(x1, x2):
    # (x1 - x2) ** 2 为特征差的平方
    # np.sum进行求和运算
    # np.sqrt进行开方运算
    return np.sqrt(np.sum((x1 - x2) ** 2))
```

## KNN代码

由于前面已经介绍过KNN的算法流程了，在此处直接给出实现代码(此处的代码并不是最优的，有其他优化方式，有兴趣的可以自己研究)，代码给出了详细注释。

```Python
def knn(train_x, train_y, test_x, sim_func=None, K=10):
    # 防御性编程，忽略
    assert sim_func is not None
    # 声明结果存储的空间，所有元素初始化为0
    test_y = np.zeros(M2).astype(int)
    # 遍历每一个test_x中的样本，enumerate函数使得在遍历的同时返回其遍历序号，默认idx以0开始
    for idx, X1 in enumerate(test_x):
        # 我们需要一个列表来存储所有计算的距离值
        neighbors = []
        # 遍历每一个train_x中的样本，zip函数可以对多个序列进行遍历，
        # 因此我们可以很方便的同时得到train_x中的X1的特征以及它对应的标签
        for X2, Y2 in zip(train_x, train_y):
            # 使用距离函数sim_func计算样本X1和X2的距离dis
            dis = sim_func(X1, X2)
            # 我们将距离和标签以Python元组的形式(dis, Y2)放入前面声明的列表中
            neighbors.append((dis, Y2))
        # 对neighbors列表中的所有元组进行排序，
        # 比较关键字key使用了每个元组中的第0个元素即(dis, Y2)中的dis
        # 这样我们得到了一个dis从小到大排列的列表
        neighbors.sort(key=lambda x: x[0])
        # 使用Python的切片功能我们保留neighbors的前K个元素(即dis最小的前K个)
        neighbors = neighbors[:K]
        # 声明一个字典votes
        votes = {}
        # 遍历neighbors中的K个元素
        for dis, label in neighbors:
            # 如果当前遍历到的标签label不在字典votes中
            # setdefault函数将会将其加入字典中，并将其值置为0
            # 如果标签在label中，setdefault函数不做任何处理
            votes.setdefault(label, 0)
            # 标签label计数加1
            votes[label] += 1
        # votes.items()方法返回一个列表(实际是一个迭代器，可以先忽略)，
        # 其形式为(label, count)，即标签和它出现的次数
        # max函数用来找到这个列表中最大的那个元素(即我们要的出现最多次的元素)
        # 比较关键字在此处为x[1]，即(label, count)中的count
        # 最后max函数返回了一个(label, count)，该对象是出现次数最多的，我们用下标[0]访问即可得到该标签，
        # 最后将该标签赋值给test_y[idx]，完成！
        test_y[idx] = max(votes.items(), key=lambda x: x[1])[0]
    return test_y
```

最后保存并执行，即可得到预期结果

```sh
$ python3 knn.py
Evaluating with your implementation of L1 distance
Accuracy: 100.00%
Conguratulations, Your implementation is correct

Evaluating with your implementation of L2 distance
Accuracy: 100.00%
Conguratulations, Your implementation is correct
```

至此，一个简单的KNN算法工作完毕。