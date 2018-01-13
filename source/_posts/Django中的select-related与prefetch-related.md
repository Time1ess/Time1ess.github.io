---
title: Django中的select_related与prefetch_related
date: 2018-01-12 17:11:00
tags: [Python,Django,数据库]
categories: Django
---

Django是一个基于Python的网站开发框架，一个很重要的特点就是Battery Included，简单来说就是包含了常规开发中所需要的一切东西，包括但不限于完整的ORM模型、中间件、会话处理、模板语言、路由映射、管理员站点等，大大提高了开发者的开发体验，今天要谈的东西便是属于Django ORM这块中查询集优化的内容。

<!-- more -->

在很早之前(1.4)就已经接触到了Django，也使用Django开发了一些项目练手，但是直到最近的一个项目才让我对Django的认识有了进一步的提高。这个问题来源于默认情况下ORM查询集的效率比较低，特别对于外键关系较多较深的模型，使用默认的查询将会导致难以忍受低效率，要谈到优化首先得从Django ORM的查询集工作方式说起。

# Queryset惰性求值

## Queryset是惰性的

在Django中，所有的Queryset都是惰性的，意思是当创建一个查询集的时候，并没有跟数据库发生任何交互。因此我们可以对查询集进行级联的filter等操作，只有在访问Queryset的内容的时候，Django才会真正进行数据库的访问，如以下例子:

```Python
>>> q = Entry.objects.filter(headline__startswith="What")
>>> q = q.filter(pub_date__lte=datetime.date.today())
>>> q = q.exclude(body_text__icontains="food")
>>> print(q)
```

表面上来看该段代码进行了3次查询集操作，第一次获取所有以字段`headline`以`What`开头的Entry对象，第二次在前一次的基础上再次过滤，第三次在过滤。但实际上，Queryset的结果在真正使用之前都不会被获取，因此，只有到了最后一句`print(q)`的时候，Django才会真正的到数据库中获取相关数据，因此，整段代码其实只执行了一次数据库查询。

## 外键关系仍然是惰性的

在数据库中，外键(Foreignkey)这一字段是十分常见的，而在Django中也提供了对应的相关字段，如以下定义:

```Python
class A(models.Model):
    foo = models.IntegerField()


class B(models.Model):
    a = models.ForeignKey(A, on_delete=models.CASCADE, related_name='bs')
```

我们定义了一个带有一个`foo`字段的模型`A`，以及一个外键关联到`A`上的模型`B`，当我们获取一个`B`对象的时候，其`a`字段对应的模型`A`并没有被立刻获取，如以下代码:

```Python
>>> b = B.objects.first()
>>> print(b.a)
```

执行第一条语句获取到对象`b`的时候并没有把对应的a也获取到，因为实际上数据库`B`这个表中存储的`a`字段是`a_id`，即关联的对象的`id`，因此此处可以通过`b.a_id`获取到`id`而不真的获取`a`这个对象，这一方式也在Django的文档中提到，主要用于实际只需要`id`而不需要对象的情况。

> If you only need a foreign key value, use the foreign key value that is already on the object you’ve got, rather than getting the whole related object and taking its primary key.(译: 当你只需要一个外键值的时候，直接使用已经获得对象上的值，而不要去获取整个对象然后取它的主键值)

这一方式也引入了今天的主题，假如我需要获取一个Queryset以及其对应的外键的对象，应该如何操作？

# 访问外键对象

## 原始的访问方式

同样以上部分代码中定义的`A`与`B`为例，假设我们想打印所有`id`小于等于`k`的`B`对象的`A`对象的`foo`字段，最原始的写法是:

```Python
>>> qs = B.objects.filter(id__lte=k)
>>> for b in qs:
>>>     print(b.a.foo)
```

这种写法符合逻辑，但是在性能上却是十分低下，原因在于，虽然我们使用`filter`获得了查询集`qs`，然后使用`for`遍历`qs`(求值)，只进行了一次数据库查询，但是在`for`循环体中`print(b.a.foo)`会再次触发查询，前面讲到了，Django的外键关系也是惰性的，因此获取`B`对象的时候并没有去获取相应的`A`对象，而是在真正使用的时候触发查询，也就是在打印`b.a.foo`的时候，这时候会触发一次数据库查询去查找`b`对应的`a`，而`for`在查询集`qs`上一共循环了`k`次，因此一共导致了`k+1`次数据库查询。

为了直观的演示这一过程，我们以`k=5`为例，并使用[django-debug-toolbar](https://github.com/jazzband/django-debug-toolbar)工具监视数据库查询。结果如下:

![](filter_id_lte_5.png)

可以看到，第三行SQL语句查询了所有`id <= 5`的`B`对象，然后每次进行`print`的时候，都会触发一次SQL查询获得`a`的信息，因此共执行了`6`次查询。

## select_related - 数据库上的join

Django考虑到了这种低效的查询方式，因此在设计ORM的时候设计了提升性能的方式。`select_related`就是其中之一。

`select_related`将会根据外键关系，在执行查询语句的时候一次性获得相关对象的信息，这种操作带来的结果是更加复杂的查询语句和避免对于即将使用的外键对象的额外数据库查询。Django的[文档](https://docs.djangoproject.com/en/2.0/ref/models/querysets/#django.db.models.query.QuerySet.select_related)详细的描述了相关内容，在此只进行简要介绍。标准的查询代码如下:

```Python
# 执行数据库查询获取b
b = B.objects.get(id=5)

# 再次执行数据库查询获取关联的对象a
a = b.a
```

![](get_without_select_related.png)


换用`select_related`之后，代码如下:

```Python
# 执行数据库查询获取b
b = B.objects.select_related('a').get(id=5)

# 不再执行数据库查询，因为前一次操作中已经获取了a的相关信息
a = b.a
```

![](get_with_select_related.png)

我们可以看到，`select_related`实际上是在数据库层面进行了一次`inner join`操作，因此一次性获取了所有需要的信息。

需要注意的是，我们可以使用任意外键关系(ForeignKeyField)或一对一关系(OneToOneField)作为参数传给`select_related`，同时也可以使用反向的一对一关系，此时应使用`related_name`作为参数。某些情况下，你可能想获取所有的相关对象，或者你并不知道关联关系，此时可以使用不加参数的`.select_related()`，该方式下将会根据关联关系(级联的)获取所有关联的对象, 即假设有外键关系为`A<-B<-C`，使用`C.objects.select_related()`将同时获取相关`A`和`B`的信息。

<div class="tip">
该方式在**大多数情况下不推荐使用**
</div>

## prefetch_related - Python上的join

与`select_related`类似，`prefetch_related`也可以大幅提高查询效率，但是`prefetch_related`的方式跟`select_related`大不一样。

`select_reateld`是通过创建一条包含SQL join操作的`SELECT`语句来一次性获得所有相关对象的信息。因此，`select_related`需要从**同一个**数据库中获得相关对象。但是，为了避免由于join操作带来的较大的查询集结果，`select_related`被限制在了**单值**关系——外键关系或一对一关系。

另一方面，`prefetch_related`为每一个关系使用了单独的查询，并在Python层面进行'join'操作，因此该操作允许多对多关系以及反向关系，而这是`select_related`无法做到的。我们这次使用`prefetch_related`执行查询，代码如下:

```Python
# 执行数据库查询获取b
b = B.objects.prefetch_related('a').get(id=5)

# 不再执行数据库查询，因为前一次操作中已经获取了a的相关信息
a = b.a
```

![](get_with_prefetch_related.png)

可以看到，Django首先进行了`id=5`的第一次查询获取对象`b`，然后根据外键关系进行了第二次查询获取`b.a`。为了增强理解，我们引入第三个模型`C`，这次我们从`A`模型上查询`id__lte=5`的`A`对象及其相关对象，代码如下:

```Python
# 定义
class C(models.Model):
    b = models.ForeignKey(B, on_delete=models.CASCADE, related_name='cs')
    

qs = A.objects.prefetch_related('bs', 'bs__cs').filter(id__lte=5)
```

![](filter_id_lte_5_with_prefetch_related.png)

Django首先查询了`id`小于等于5的所有`A`对象，然后根据反向关联关系，查询所有外键到这些`A`对象的`B`对象，然后查询所有外键到这些`B`对象的`C`对象。

篇幅关系，对于`prefetch_related`的介绍就到这里，下面对三种查询方式(原始，`select_related`，`prefetch_related`)的性能进行一些简单的实验。

# select_related与prefetch_related性能对比

为了比较两种优化方式相比于标准查询带来的性能提升，我分别定义了两组模型并编写代码进行了相关实验，模型简要说明如下:

### 第一组:
模型|字段说明
:--:|:--:
A|4 x IntegerField, 4 x FloatField, 4 x DateTimeField, 4 x UUIDField, 4 x CharField
B|ForeignKey(A), 4 x IntegerField, 4 x FloatField, 4 x DateTimeField, 4 x UUIDField, 4 x CharField
C|ForeignKey(B), 4 x IntegerField, 4 x FloatField, 4 x DateTimeField, 4 x UUIDField, 4 x CharField
D|ForeignKey(C), 4 x IntegerField, 4 x FloatField, 4 x DateTimeField, 4 x UUIDField, 4 x CharField
E|ForeignKey(D), 4 x IntegerField, 4 x FloatField, 4 x DateTimeField, 4 x UUIDField, 4 x CharField

### 第二组:
模型|字段说明x
:--:|:--:
A1|1 x IntegerField, 1 x FloatField, 1 x DateTimeField
B1|ForeignKey(A1), 1 x IntegerField, 1 x FloatField, 1 x DateTimeField
C1|ForeignKey(B1), 1 x IntegerField, 1 x FloatField, 1 x DateTimeField
D1|ForeignKey(C1), 1 x IntegerField, 1 x FloatField, 1 x DateTimeField
E1|ForeignKey(D1), 1 x IntegerField, 1 x FloatField, 1 x DateTimeField

前一组每个模型拥有约21个字段，后一组每个模型拥有约4个字段，CharField设置了max_length=100，DateTimeField设置了auto_now_add=True，UUIDField设置了default=uuid4, editable=False，所有的查询都是以E(E1)为出发点。

## 复杂模型上的表现

首先来看第一组的实验结果, 首先我们来比较随着获取对象数量的提高，查询时间的变化:

![](complex_raw_sel_pre_tot.png)

可以看出，三者耗时随获取对象数量的争夺呈现近乎线性的关系，符合直观预期，同时，没有经过优化的标准查询相比于经过优化的查询，斜率明显高很多，标准查询更易受查询集大小变化的影响，因此在查询集较大时进行优化是必不可少的，且根据前文所述，我们可以很容易的计算执行的SQL语句数量，标准查询: `1 + 5 * N`条，`select_related`: `1`条，`prefetch_related`: `5`条。

> 注: 横坐标的对象指的是一共获取的对象数量，因为`A<-B<-C<-D<-E`，查询每一个`E`对象，都会获得5个对象，因此横坐标的100000代表一共查询了20000个E对象。

再来看每个对象的平均查询时间:

![](complex_raw_sel_pre_avg.png)

可以看出，每个对象的查询时间在实验条件下并没有随着查询集的大小发生太大的变化，且单个对象的查询效率优化后有至少7倍以上的提高。

为了详细对比`select_related`与`prefetch_related`，我们剔除标准查询后再进行比较:

![](complex_sel_pre_tot.png)
![](complex_sel_pre_avg.png)

可以看出，在总时间上，查询对象数量小于大约135000的时候二者的查询效率区别并不大，`select_related`略优于`prefetch_related`，但是超过了这一界限之后，二者的差距明显拉开，这可以理解为当查询集增大时SQL的`join`操作的开销大于多次`SELECT`的开销，从平均查询时间的图中也可以得出结论，由于查询集大小的增加，`prefetch_related`中多条`SELECT`语句的开销被均摊，因此导致单个对象的查询效率提高(查询时间降低)，而`select_related`的`join`操作的开销并不随着数量增多被均摊。因此在查询集较大的时候使用`prefetch_related`性能上可能更好。 

## 简单模型上的表现

我们再来看第二组实验结果，查询时间随获取对象数量的提高的变化结果与前一组类似，优化后仍远好于优化前:

![](simple_raw_sel_pre_tot.png)
![](simple_raw_sel_pre_avg.png)

我认为区别较大的地方在`select_related`与`prefetch_related`的变化:

![](simple_sel_pre_tot.png)
![](simple_sel_pre_avg.png)

在有限的实验条件内，在模型字段并不复杂且数量并不多的情况下，`select_related`的效率均优于`prefetch_related`，具体表现为前者查询总时间上均少于后者，但是从第二幅图中，我们可以观测到`prefetch_related`的平均查询时间下降的趋势，由于时间关系我只再进行了一次`X=600000`的实验，并没有观测到超过`select_related`的情况。

## 小结

在查询集中的对象字段较多较复杂，且查询集较大的时候，或需要使用反向外键关系或多对多关系作为参数优化查询的时候，应该选用`prefetch_related`，在查询集中对象字段简单的，查询集不大的时候，应选用`select_related`。

# 总结

本文通过对Django的查询集的惰性求值相关内容的介绍，引入了使用`select_related`和`prefetch_related`优化查询集效率的介绍，最后通过两组实验比较了`select_related`和`prefetch_related`的性能并给出了选用建议。

# 参考文献

* https://docs.djangoproject.com/en/2.0/topics/db/queries/#querysets-are-lazy
* https://docs.djangoproject.com/en/2.0/ref/models/querysets/#select-related
* https://docs.djangoproject.com/en/2.0/ref/models/querysets/#prefetch-related