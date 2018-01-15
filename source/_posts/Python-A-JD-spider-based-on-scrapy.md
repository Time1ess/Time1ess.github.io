---
title: 基于Scrapy的京东商品评论爬虫
date: 2017-03-12 22:07:57
tags: [Python,爬虫,Scrapy]
categories: Python
---
今天想跟大家分享的是关于网络爬虫的相关知识，网络爬虫是一种根据一定的规则，自动地对互联网上相关内容进行抓取的程序或者脚本，本文的内容主要是通过分析京东评论的加载过程，获取相关API，然后通过使用基于Python语言的开源网络爬虫框架——Scrapy，大量获取相关评论内容。

<div class="tip">
本文假定读者具有一定的Python编程经验，具有少量HTTP协议和HTML的相关知识，对爬虫的工作原理有一定了解。
</div>

<!-- more -->

# API获取

在开始编写爬虫之前，我们需要获得启动爬虫所需要的相关链接。在本文，我们将以对京东鞋类评论爬取为例，进行说明(其他种类爬取流程类似，区别只在于数据处理)。
首先打开京东，搜索“鞋”，打开任意一件商品，并切换到“商品评价”标签页，如图所示。

![comments_tab](item_shoe_comments_tab.png)

启用浏览器的网页分析功能，以Safari浏览器为例，右键点击网页任意部分，选择”检查元素“，切换到“网络”标签下，如果有其他内容的话，可以点击右侧的垃圾桶图标清空历史，如图所示。

![console_network_before](console_network_before.png)

然后我们点击评论区的换页按钮，切换到任意一页新的评论，此时可以发现浏览器对本次点击产生的数据交换过程进行了记录，我们发现其中有一条名为"productPageComments.action"的记录，对其进行分析可以看到对应的完整URL，如图所示。

![console_network_after](console_network_after.png)

其完整URL为:`https://club.jd.com/comment/productPageComments.action?callback=fetchJSON_comment98vv6630&productId=10353518575&score=0&sortType=5&page=1&pageSize=10&isShadowSku=0`

显而易见，评论的加载是通过GET请求实现，对我们来说，该URL中最关键的GET参数为`productID`和`page`，它们分别定义了对应的商品编号以及评论页码。通过访问该URL，我们可以得到内容如图所示。

![comments_json_1](comments_json_1.png)

可以看到，该URL返回的内容为json数据包，同时以请求中`callback`定义的函数名对其进行包裹，这一点从整个数据包最前方可以看出。我们将GET请求中callback参数去掉以后即可得到原始的json数据包，如图所示。

![comments_json_2](comments_json_2.png)

因此，在不考虑其他参数的情况下，我们需要的API格式为:`https://club.jd.com/comment/productPageComments.action?productId={}&score=0&sortType=5&page={}&pageSize=10&isShadowSku=0`


至此，我们获得了返回任意商品的任意评论页的API，下面我们将对API返回数据本身的内容进行分析。

# API返回字典分析

从前面图中可以看出，API返回数据应该是一个字典，我们通过使用requests获得API返回字典以及Python的json模块进行分析。

```Python
>>> import requests
>>> import json
>>> url = 'https://club.jd.com/comment/productPageComments.action?productId=10353518575&score=0&sortType=5&page=1&pageSize=10&isShadowSku=0'
>>> html = requests.get(url)
>>> data = json.loads(html.text)
>>> print(data.keys())
dict_keys(['productAttr', 'productCommentSummary', 'hotCommentTagStatistics',
'jwotestProduct', 'maxPage', 'score', 'soType', 'imageListCount',
'vTagStatistics', 'comments'])
```

其中对我们来说最重要的是键`comments`所对应的值，值为一个列表，其中每个元素为一个字典，存放的是每一条评论的相关信息。

```Python
>>> print(type(data['comments']))
<class 'list'>
>>> import pprint
>>> pprint(data['comments'][0])
{'afterDays': 0,
 'anonymousFlag': 1,
 'commentTags': [{'commentId': 1927838458,
                  'created': '2016-10-19 18:26:50',
                  'id': 12373951,
                  'modified': '2016-10-19 18:26:50',
                  'name': '穿上很舒服',
                  'pin': '',
                  'productId': 10353518575,
                  'rid': 11632,
                  'status': 0}],
 'content': '鞋子很不错，弹性很不错，材质很轻。穿上很舒服。透气性好，而且又长高了两厘米。',
 'creationTime': '2016-10-19 18:26:20',
 'days': 8,
 'firstCategory': 1318,
 'guid': 'cc2fec79-304b-48c5-a263-151bf7d098d2',
 'id': 1927838458,
 'integral': -20,
 'isMobile': False,
 'isReplyGrade': False,
 'isTop': False,
 'nickname': 'j***k',
 'orderId': 0,
 'plusAvailable': 0,
 'productColor': '黑/安踏白',
 'productSales': [],
 'productSize': '8(男41)',
 'recommend': True,
 'referenceId': '10353518575',
 'referenceImage': 'jfs/t3073/150/7342609081/176958/b211c3f7/58b4c73cN9621804d.jpg',
 'referenceName': '安踏男鞋 易弯折科技跑步鞋 2017新款透气网面运动鞋 黑/安踏白-1 8(男41)',
 'referenceTime': '2016-10-11 20:03:00',
 'referenceType': 'Product',
 'referenceTypeId': 0,
 'replyCount': 0,
 'score': 5,
 'secondCategory': 12099,
 'status': 1,
 'thirdCategory': 9756,
 'title': '',
 'usefulVoteCount': 1,
 'uselessVoteCount': 0,
 'userClient': 0,
 'userClientShow': '',
 'userImage': 'misc.360buyimg.com/lib/img/u/b56.gif',
 'userImageUrl': 'misc.360buyimg.com/lib/img/u/b56.gif',
 'userImgFlag': 0,
 'userLevelColor': '#666666',
 'userLevelId': '56',
 'userLevelName': '铜牌会员',
 'userProvince': '',
 'viewCount': 0}
```

根据实际需要，在本次实现中选取了以下信息:

* guid				--> 评论用户id
* id				--> 该评论id
* referenceId		--> 评论商品id
* creationTime	--> 评论时间
* score			--> 评论评分
* userProvince	--> 评论用户归属地
* userLevelName	--> 评论用户会员级别
* productColor	--> 评论用户购买颜色
* productSize		--> 评论用户购买尺寸

至此，我们完成了对API返回字典的分析，在构建Scrapy爬虫之前，我们还需要对商品列表进行分析。

# 商品列表分析

我们已经拥有对任意给定的商品id,获取其所有评论的API，但在构建爬虫之前，我们还有最后一个问题，如何获得商品id?
我们可以很容易的获得并格式化京东的搜索链接:`https://search.jd.com/Search?keyword={}&enc=utf-8&page={}`，根据该格式化链接，我们只需要填写搜索关键字以及搜索页码就能得到对应页的搜索结果。通过对网页源代码进行分析，可以发现每个商品都处于`class="gl-item"`的`li`元素下，如图所示。

![console_item_list](console_item_list.png)
![console_item_list_2](console_item_list_2.png)

我们只需要对`class="gl-item"`的`li`元素下`class="p-img"`的`div`元素下的`a`元素的`href`属性进行提取处理即可得到商品id，如图中的`10353518575`。

至此，我们完成了对商品列表的分析工作，接下来我们将构建基于Scrapy的爬虫来完成对评论的爬取工作。

# (可选)商品详细信息

我们在上节中获得了商品的详细信息链接，如:`https://item.jd.com/10353518575.html`，我们可以对该页面内容进行爬取以获得更全面的商品信息。在这部分需要注意的是，很多内容是通过JavaScript进行动态加载的，在爬取时需要注意，否则得到的数据并不符合需要。通过启用浏览器的“停用JavaScript"功能，可以看到在不执行JavaScript时的页面是什么样的，如图所示。

![item_detail_no_js](item_detail_no_js.png)

可以看到，商品的价格等信息是没有进行加载的，所以如果需要对价格进行爬取，需要使用到selenium等工具来完成浏览器的模拟或者进一步分析JavaScript的执行逻辑。

# Scrapy爬虫

Scrapy是一个为了爬取网站数据，提取结构性数据而编写的应用框架。可以应用在包括数据挖掘，信息处理或存储历史数据等一系列的程序中。其最初是为了网络抓取所设计的，也可以应用在获取API所返回的数据(例如 Amazon Associates Web Services ) 或者通用的网络爬虫。

要使用Scrapy，首先得建立项目:

```
$ scrapy startproject jd
New Scrapy project 'jd', using template directory '/usr/local/lib/python3.6/site-packages/scrapy/templates/project', created in:
    /private/tmp/jd

You can start your first spider with:
    cd jd
    scrapy genspider example example.com
```

在建好的`jd`文件夹下，有一个`jd`文件夹以及一个`scrapy.cfg`文件，进入前者，可以看到以下内容:

```
$ ls
__init__.py    items.py       pipelines.py   spiders
__pycache__    middlewares.py settings.py
```

其中:

* items.py 		--> 完成数据容器Item的定义
	爬取的主要目标就是从非结构性的数据源提取结构性数据，例如网页。Scrapy提供 Item 类来满足这样的需求。Item 对象是种简单的容器，保存了爬取到得数据。 其提供了 类似于词典(dictionary-like) 的API以及用于声明可用字段的简单语法。
* pipelines.py	--> 完成对Item处理流水线的定义
	当Item在Spider中被收集之后，它将会被传递到Item Pipeline，一些组件会按照一定的顺序执行对Item的处理。每个item pipeline组件(有时称之为“Item Pipeline”)是实现了简单方法的Python类。他们接收到Item并通过它执行一些行为，同时也决定此Item是否继续通过pipeline，或是被丢弃而不再进行处理。
	以下是item pipeline的一些典型应用：
	* 清理HTML数据
	* 验证爬取的数据(检查item包含某些字段)
	* 查重(并丢弃)
	* 将爬取结果保存到数据库中
* middlewares.py	--> 完成Spider中间件的定义
	Spider中间件是介入到Scrapy的spider处理机制的钩子框架，通过定义并使用中间件，可以对发送给Spiders的response以及Spiders产生的Request对象进行处理。
* settings.py		--> 完成对爬虫的控制
	Scrapy settings提供了定制Scrapy组件的方法。通过修改settings.py，可以控制包括核心(core)，插件(extension)，pipeline及spider组件。settings为代码提供了提取以key-value映射的配置值的的全局命名空间(namespace)。settings同时也是选择当前激活的Scrapy项目的方法。
* spiders			--> 完成对爬虫Spider的定义
	Spider类定义了如何爬取某个(或某些)网站。包括了爬取的动作(例如:是否跟进链接)以及如何从网页的内容中提取结构化数据(爬取item)。换句话说，Spider就是定义爬取的动作及分析某个网页(或者是有些网页)的地方。

#### 定义数据容器items
```Python
import scrapy


class ShoeCommentItem(scrapy.Item):
    # define the fields for your item here like:
    # name = scrapy.Field()
    _id = scrapy.Field()
    iid = scrapy.Field()
    uid = scrapy.Field()
    creation_time = scrapy.Field()
    score = scrapy.Field()
    user_province = scrapy.Field()
    user_level = scrapy.Field()
    color = scrapy.Field()
    size = scrapy.Field()

class ShoeDetailItem(scrapy.Item):
    iid = scrapy.Field()
    name = scrapy.Field()
    shop = scrapy.Field()
    scores = scrapy.Field()
```

#### 定义爬虫类

创建爬虫类的命令为:`scrapy genspider [爬虫名] [允许爬取域名]`

```
$ scrapy genspider shoes jd.com
Created spider 'shoes' using template 'basic' in module:
  jd.spiders.shoes
```

接着打开`spiders`文件夹下的`shoes.py`文件进行编辑:
* 首先我们需要定义一些变量，比如包含搜索关键字的列表、格式化搜索链接、格式化评论API链接等:
```Python
shoe_cates = [
    '女深口单鞋', '工装鞋', '女鞋', '正装鞋', '平底鞋', '平底女鞋',
    '功能鞋', '中跟单鞋', '女拖鞋', '凉鞋', '拖鞋', '帆布鞋', '人字拖',
    '马丁靴', '商务休闲鞋', '传统布鞋', '休闲鞋', '鞋', '棉鞋', '定制鞋',
    '男靴', '坡跟单鞋', '短靴', '雨鞋', '平板鞋', '尖头单鞋', '军靴', '女靴',
    '皮鞋', '小白鞋', '雪地靴', '女豆豆鞋', '妈妈鞋', '增高鞋', '劳保鞋',
    '豆豆鞋', '踝靴', '沙滩鞋', '鞋 女', '深口单鞋', '板鞋', '高帮鞋',
    '人字拖鞋', '内增高', '发光鞋', '运动鞋', '高跟鞋', '雨靴', '鞋 男',
    '乐福鞋', '内增高休闲鞋', '老人鞋', '男鞋', '平底单鞋', '浅口单鞋', '单鞋']
shoe_list_url = 'https://search.jd.com/Search?keyword={}&enc=utf-8&page={}'
comment_url_api = ('https://club.jd.com/comment/productPageComments.action?'
    'productId={}&score=0&sortType=5&page={}&pageSize=10&isShadowSku=0')
num_pat = re.compile('(\d*?)')
```

* 然后编辑`ShoesSpider`类:
```Python
class ShoesSpider(Spider):
    name = 'shoes'
    allowed_domains = ['jd.com']
    start_urls = [shoe_list_url.format(cate, page) for cate in shoe_cates
                  for page in range(1, 101)]

    def parse(self, response):
        item_urls = response.xpath('//li[@class="gl-item"]/div')
        for item_xpath in item_urls:
            url = item_xpath.xpath('div[@class="p-img"]/a'
                                   '/@href').extract_first()
            if not url or 'ccc-x' in url:
                continue
            iid = url[url.rfind('/')+1:-5]
            detail_url = 'http:' + url
            yield Request(
                detail_url,
                callback=self.parse_detail,
                meta={'iid': iid})
            yield Request(
                comment_url_api.format(iid, 1),
                callback=self.parse_comment,
                meta={'page': 1, 'iid': iid, 'retry': 0})

    def parse_detail(self, response):
        iid = int(response.meta['iid'])
        name = response.xpath('//div[@class="sku-name"]'
                              '/text()').extract_first().strip('\n ')
        xpath_aside = response.xpath('//div[@class="aside"]')
        shop = xpath_aside.xpath('//div[@class="mt"]/'
                                 'h3/a/@title').extract_first().strip('\n ')
        scores = xpath_aside.xpath('//div[@class="mc"]/div/'
                                   'a//text()').extract()
        scores = [s for s in scores if s.strip('\n ')][::2]

        sd = ShoeDetailItem(iid=iid, name=name, shop=shop,
                            scores='|'.join(scores))
        yield sd

    def parse_comment(self, response):
        iid = response.meta['iid']
        page = int(response.meta['page'])
        retry = int(response.meta['retry'])
        try:
            json_data = json.loads(response.text)
        except Exception as e:
            if retry < 10:
                yield Request(
                    comment_url_api.format(iid, page),
                    callback=self.parse_comment,
                    meta={'page': page, 'iid': iid, 'retry': retry+1})
            return

        if not json_data['comments']:
            return
        for cd in json_data['comments']:
            d = {}
            d['_id'] = cd['id']
            d['iid'] = cd['referenceId']
            d['uid'] = cd['guid']
            d['creation_time'] = cd['creationTime']
            d['score'] = cd['score']
            d['user_province'] = cd['userProvince']
            d['user_level'] = cd['userLevelName']
            d['color'] = cd['productColor']
            d['size'] = cd['productSize']
            sc = ShoeCommentItem(d)
            yield sc
        yield Request(
            comment_url_api.format(iid, page+1),
            callback=self.parse_comment,
            meta={'page': page+1, 'iid': iid, 'retry': 0})
```

详细分析下这段代码:
* 类`ShoesSpider`继承自`Spider`，其余可继承的类还有`CrawlSpider`、`XMLFeedSpider`、`SitemapSpider`，在这里我们使用了最基本的`Spider`。
* 属性`name`定义了该爬虫的名字，在启动爬虫的步骤中需要提供爬虫名字。
* 属性`allowed_domains`定义了一个列表，可以包含一个或多个域名，爬虫只会对该域名下的链接进行爬取。
* 属性`start_urls`定义了一个列表，spider启动时将从中获取链接进行爬取。
* 实例方法`parse`定义了对商品列表页面进行处理的相关逻辑:
	* 接收一个`response`参数，该`response`对象为爬虫根据`Request`对象请求获得的结果。
	* 根据前面几节的描述，`parse`方法针对商品列表页面使用xpath进行分析。
	* 在提取到商品`iid`后，对该页面下所有商品`iid`进行遍历，分别为商品详细页面(可选)以及商品评论页面构建`Request`请求，注意使用了`yield`，因为我们需要返回多个请求而不是一个请求。
	* 对每个`Request`请求，我们指定了相关参数，比如链接、回调函数，以及通过`meta`关键字保存上下文信息字典，这可以在回调函数中访问`Response`的`meta`属性获得。
* 实例方法`parse_detail`定义了对商品详细页面进行处理的相关逻辑:
	* 我们依然通过xpath进行分析，获得了商品名、商家名、商家评分等信息，使用其实例化`ShoeDetailItem`类并返回该实例。
* 实例方法`parse_comment`定义了对商品评论进行处理的相关逻辑:
	* 根据在`Request`对象中设置`meta`属性，我们可以很方便地获得当前物品id、当前评论页码、以及访问重试次数。
	* 我们需要对`response`对象的`text`属性使用`json.loads`进行格式化，但是由于各种原因可能会失败，所以我们设置了方式重试次数这一变量来控制重试，当本次`json.loads`格式化失败，我们会再次进行尝试访问该评论链接，直到达到最大重试次数10次，然后放弃。
	* 如果解析成功，判断解析后的字典中键`comments`所对应的内容是否为空，为空代表已经没有更多评论，则返回。
	* 否则，对每条评论进行遍历，使用其中的参数实例化`ShoeCommentItem`类并返回该实例。
	* 在结束评论遍历后，尝试对评论下一页发出`Request`请求。

至此，我们完成了爬虫的工作逻辑，接下来需要对流水线进行定义，完成数据的查重以及保存等操作。

#### 定义pipeline流水线

对于各个`parse`方法返回的`Item`对象，它们将会被传递到在`pipelines.py`中定义以及`settings.py`中启用的流水线中进行处理。
在本文中我们需要对每个`Item`对象做两件事，去重以及保存。对于`ShoeCommentItem`的流水线定义如下:


```Python
class ShoeCommentPipeline(object):
    seen_ids = set()

    @classmethod
    def from_crawler(cls, crawler):
        pipe = cls()
        if not os.path.exists('shoe_comments.csv'):
            return pipe
        pat = re.compile('^\d+?,')
        with open('shoe_comments.csv', 'r') as f:
            for line in f:
                _id = pat.findall(line)
                if _id:
                    pipe.seen_ids.add(_id[0])
        return pipe

    def process_item(self, item, spider):
        if not isinstance(item, ShoeCommentItem):
            return item

        _id = item['_id']
        if _id in self.seen_ids:
            raise DropItem('{} Have been processed.'.format(_id))
        self.seen_ids.add(_id)

        key_values = list(item.items())
        key_values.sort(key=lambda x: val_indices[x[0]])
        values = [str(val) for key, val in key_values]
        with open('shoe_comments.csv', 'a') as f:
            f.write(','.join(values)+'\n')
        return item
```

需要解释的是类方法`from_crawler`和实例方法`process_item`，前者在初始化时会被调用，后者在出现`Item`对象时被调用。
对于`from_crawler`方法:
* 我们需要忽略之前已经处理过的评论，因此采用了一个`set`来存储已经处理过的`id`
* 在初始化时，打开之前保存的评论文件`shoe_comments.csv`，从中获取`id`并对`seen_ids`进行填充
* 这是一个类方法，需要在最后返回类的实例

对于`process_item`方法:
* 方法接收两个参数，前一个是返回的`Item`对象，后一个是返回该对象的对应`Spider`对象
* 首先判断了该`Item`是否是类`ShoeCommentItem`实例，如果不是的话不进行处理直接返回该对象
* 提取该对象的`id`并判断该对象是否已经处理过，已经处理过的话抛出`DropItem`异常，停止后续流水线的处理
* 将该对象`id`加入`seen_ids`，并根据`val_indices`定义的顺序将其排序及格式化字符串并追加到`shoe_comments.csv`中
* 返回该对象

> 需要特别注意的是，`process_item`方法必须返回一个`Item`(或任何继承类)对象或者是抛出`DropItem`异常，被丢弃的item将不会被之后的pipeline组件所处理，而正常返回的会。

同理我们可以定义`ShoeDetailItem`的流水线:

```Python
class ShoeDetailPipeline(object):
    seen_ids = set()

    @classmethod
    def from_crawler(cls, crawler):
        pipe = cls()
        if not os.path.exists('shoe_details.csv'):
            return pipe
        pat = re.compile('^\d+?,')
        with open('shoe_details.csv', 'r') as f:
            for line in f:
                iid = pat.findall(line)
                if iid:
                    pipe.seen_ids.add(iid[0])
        return pipe

    def process_item(self, item, spider):
        if not isinstance(item, ShoeDetailItem):
            return item

        iid = item['iid']
        if iid in self.seen_ids:
            raise DropItem('{} detail have been processed.'.format(iid))
        self.seen_ids.add(iid)

        key_values = list(item.items())
        key_values.sort(key=lambda x: detail_indices[x[0]])
        values = [str(val) for key, val in key_values]
        with open('shoe_details.csv', 'a') as f:
            f.write(','.join(values)+'\n')
        return item
```

该流水线逻辑与前一个类似，在此不再赘述。

#### settings.py的配置

我们还需要对`settings.py`进行配置。
其中关键的几个设置是:
* CONCURRENT_REQUESTS(并发请求数): 100
* COOKIES_ENABLED(启用cookies): False
* ITEM_PIPELINES(item流水线): {'jd.pipelines.ShoeCommentPipeline': 300, 'jd.pipelines.ShoeDetailPipeline': 301}

具体设置可以根据自己的需求进行设置，以上只是一个示例。

#### 启动

最后，让我们启动这个爬虫:

```
$ scrapy crawl shoes
```

可以在控制台看到输出:

```
2017-03-13 19:21:12 [scrapy.utils.log] INFO: Scrapy 1.3.0 started (bot: jd)
2017-03-13 19:21:12 [scrapy.utils.log] INFO: Overridden settings: {'BOT_NAME': 'jd', 'CONCURRENT_REQUESTS': 100, 'COOKIES_ENABLED': False, 'DOWNLOAD_DELAY': 0.01, 'NEWSPIDER_MODULE': 'jd.spiders', 'SPIDER_MODULES': ['jd.spiders']}
2017-03-13 19:21:12 [scrapy.middleware] INFO: Enabled extensions:
['scrapy.extensions.corestats.CoreStats',
 'scrapy.extensions.telnet.TelnetConsole',
 'scrapy.extensions.logstats.LogStats']
2017-03-13 19:21:12 [scrapy.middleware] INFO: Enabled downloader middlewares:
['scrapy.downloadermiddlewares.httpauth.HttpAuthMiddleware',
 'scrapy.downloadermiddlewares.downloadtimeout.DownloadTimeoutMiddleware',
 'scrapy.downloadermiddlewares.defaultheaders.DefaultHeadersMiddleware',
 'scrapy.downloadermiddlewares.useragent.UserAgentMiddleware',
 'jd.middlewares.RandomUserAgentMiddleware',
 'jd.middlewares.ProxyMiddleware',
 'scrapy.downloadermiddlewares.retry.RetryMiddleware',
 'scrapy.downloadermiddlewares.redirect.MetaRefreshMiddleware',
 'scrapy.downloadermiddlewares.httpcompression.HttpCompressionMiddleware',
 'scrapy.downloadermiddlewares.redirect.RedirectMiddleware',
 'scrapy.downloadermiddlewares.stats.DownloaderStats']
2017-03-13 19:21:12 [scrapy.middleware] INFO: Enabled spider middlewares:
['scrapy.spidermiddlewares.httperror.HttpErrorMiddleware',
 'scrapy.spidermiddlewares.offsite.OffsiteMiddleware',
 'scrapy.spidermiddlewares.referer.RefererMiddleware',
 'scrapy.spidermiddlewares.urllength.UrlLengthMiddleware',
 'scrapy.spidermiddlewares.depth.DepthMiddleware']
2017-03-13 19:21:12 [scrapy.middleware] INFO: Enabled item pipelines:
['jd.pipelines.ShoeCommentPipeline', 'jd.pipelines.ShoeDetailPipeline']
2017-03-13 19:21:12 [scrapy.core.engine] INFO: Spider opened
2017-03-13 19:21:12 [scrapy.extensions.logstats] INFO: Crawled 0 pages (at 0 pages/min), scraped 0 items (at 0 items/min)
2017-03-13 19:21:12 [scrapy.extensions.telnet] DEBUG: Telnet console listening on 127.0.0.1:6023
2017-03-13 19:21:13 [scrapy.core.engine] DEBUG: Crawled (200) <GET https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=3> (referer: None)
2017-03-13 19:21:13 [scrapy.core.engine] DEBUG: Crawled (200) <GET https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=7> (referer: None)
2017-03-13 19:21:16 [scrapy.core.engine] DEBUG: Crawled (200) <GET https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=6> (referer: None)
2017-03-13 19:21:16 [scrapy.core.engine] DEBUG: Crawled (200) <GET https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=9> (referer: None)
2017-03-13 19:21:16 [scrapy.core.engine] DEBUG: Crawled (200) <GET https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=5> (referer: None)
2017-03-13 19:21:16 [scrapy.core.engine] DEBUG: Crawled (200) <GET https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=10> (referer: None)
2017-03-13 19:21:16 [scrapy.core.engine] DEBUG: Crawled (200) <GET https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=2> (referer: None)
2017-03-13 19:21:16 [scrapy.core.engine] DEBUG: Crawled (200) <GET https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=1> (referer: None)
2017-03-13 19:21:16 [scrapy.dupefilters] DEBUG: Filtered duplicate request: <GET http://item.jd.com/10536835318.html> - no more duplicates will be shown (see DUPEFILTER_DEBUG to show all duplicates)
2017-03-13 19:21:16 [scrapy.core.engine] DEBUG: Crawled (200) <GET https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=8> (referer: None)
2017-03-13 19:21:16 [scrapy.core.engine] DEBUG: Crawled (200) <GET http://item.jd.com/10536835318.html> (referer: https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=6)
2017-03-13 19:21:16 [scrapy.core.engine] DEBUG: Crawled (200) <GET https://club.jd.com/comment/productPageComments.action?productId=10589923020&score=0&sortType=5&page=1&pageSize=10&isShadowSku=0> (referer: https://search.jd.com/Search?keyword=%E5%A5%B3%E6%B7%B1%E5%8F%A3%E5%8D%95%E9%9E%8B&enc=utf-8&page=7)
2017-03-13 19:21:16 [scrapy.core.scraper] DEBUG: Scraped from <200 http://item.jd.com/10536835318.html>
{'iid': 10536835318,
 'name': '她芙 单鞋女2017春季新款中跟短靴女时尚女鞋性感尖头细跟单鞋深口裸靴防水台高跟鞋 黑色 37-标准码',
 'scores': '9.72|9.75|9.65|9.63',
 'shop': '卡曼鞋类专营店'}
2017-03-13 19:21:16 [scrapy.core.scraper] DEBUG: Scraped from <200 https://club.jd.com/comment/productPageComments.action?productId=10589923020&score=0&sortType=5&page=1&pageSize=10&isShadowSku=0>
{'_id': 10199823376,
 'color': '金黑色.',
 'creation_time': '2017-03-10 13:59:31',
 'iid': '10589923020',
 'score': 5,
 'size': '36',
 'uid': '069d0baa-022b-421b-a43a-584f5aa3921e',
 'user_level': '铜牌会员',
 'user_province': ''}
2017-03-13 19:21:16 [scrapy.core.scraper] DEBUG: Scraped from <200 https://club.jd.com/comment/productPageComments.action?productId=10589923020&score=0&sortType=5&page=1&pageSize=10&isShadowSku=0>
{'_id': 10175008135,
 'color': '金黑色.',
 'creation_time': '2017-03-02 12:18:57',
 'iid': '10589923020',
 'score': 5,
 'size': '36',
 'uid': '28dfd6c2-caf2-427d-9927-cf088d3099ea',
 'user_level': '铜牌会员',
 'user_province': '湖南'}
2017-03-13 19:21:16 [scrapy.core.scraper] DEBUG: Scraped from <200 https://club.jd.com/comment/productPageComments.action?productId=10589923020&score=0&sortType=5&page=1&pageSize=10&isShadowSku=0>
{'_id': 10163486837,
 'color': '金黑色.',
 'creation_time': '2017-02-26 15:28:14',
 'iid': '10589923020',
 'score': 5,
 'size': '36',
 'uid': '736ad5a4-9470-4dcc-832d-b59094cf84f4',
 'user_level': '铜牌会员',
 'user_province': '云南'}
 ```

在运行一段时间后，查看`shoe_comments.csv`和`shoe_details.csv`内容:

* `shoe_comments.csv`
```
10199823376,10589923020,069d0baa-022b-421b-a43a-584f5aa3921e,2017-03-10 13:59:31,5,,铜牌会员,金黑色.,36
10175008135,10589923020,28dfd6c2-caf2-427d-9927-cf088d3099ea,2017-03-02 12:18:57,5,湖南,铜牌会员,金黑色.,36
10163486837,10589923020,736ad5a4-9470-4dcc-832d-b59094cf84f4,2017-02-26 15:28:14,5,云南,铜牌会员,金黑色.,36
10205838152,10589923020,93f35818-129f-4aaa-8ea9-549c28a4f791,2017-03-12 14:37:59,5,,注册会员,金黑色.,36
10175298549,10589923020,fe1a26e0-8cae-43c3-b0d4-c99bf1d961cf,2017-03-02 13:49:07,5,,铜牌会员,金黑色.,36
10205858068,10589923020,65a7243e-7116-4075-b64a-6e8d8d8382a4,2017-03-12 14:44:29,5,,铜牌会员,金黑色.,36
10206280836,10589923020,1d9b5332-5ca6-40be-b408-250606f68c17,2017-03-12 17:00:48,5,,注册会员,金黑色.,36
10200243913,10589923020,966cda26-ce10-432a-8309-95199ad1903e,2017-03-10 16:15:02,5,,铜牌会员,金黑色.,36
10164313667,10589923020,d09eab89-ed53-47a3-abd1-c897a8bcf694,2017-02-26 20:15:01,5,北京,铜牌会员,金黑色.,36
10162862191,10589923020,ddb58374-f48b-45f9-a2a6-e5e60d53d4ce,2017-02-26 11:42:58,5,,铜牌会员,金黑色.,36
10149921178,11242420873,5f410ce9-fc38-4736-8465-88bbdd7da347,2017-02-21 19:45:56,5,上海,铜牌会员,70060黑色,36
10143787582,11242420873,3f15f14f-1d37-4ccb-befa-9acccd22a3d1,2017-02-19 19:07:20,5,海南,铜牌会员,70060黑色,36
10150729539,11242420873,a601a457-1cef-41c4-955b-3df3dd2646ec,2017-02-22 07:32:52,5,新疆,铜牌会员,70060黑色,36
10147517331,11242420873,b50e1e32-e1fe-4084-b95a-71be8a720950,2017-02-20 23:29:52,5,北京,铜牌会员,70060黑色,36
10147357719,11242420873,fe6ec9de-c39b-4d5e-9cee-bf5926abb465,2017-02-20 22:18:46,5,湖南,铜牌会员,70060黑色,36
10187242860,11242420873,f12f02f7-b378-457f-a501-cdd81f69de6c,2017-03-06 13:53:31,5,云南,铜牌会员,70060黑色,36
10203999129,11242420873,f61e40df-f919-43a2-b876-e81176d59cf9,2017-03-11 20:55:40,5,内蒙古,注册会员,70060黑色,36
10203827884,11242420873,4a73b3d7-b489-4880-8f8a-bc70015c4e18,2017-03-11 19:55:57,5,浙江,注册会员,70060黑色,36
10203810598,11242420873,4113c7e0-4556-4aa1-b441-2334bd5419d4,2017-03-11 19:49:51,5,安徽,注册会员,70060黑色,36
10203802320,11242420873,38a65bba-5284-4190-83f2-1a6a54d57da3,2017-03-11 19:46:57,5,广西,注册会员,70060黑色,36
```

* `shoe_details.csv`
```
10536835318,她芙 单鞋女2017春季新款中跟短靴女时尚女鞋性感尖头细跟单鞋深口裸靴防水台高跟鞋 黑色 37-标准码,卡曼鞋类专营店,9.72|9.75|9.65|9.63
1587186408,雅诗莱雅休闲鞋女 圆头深口低帮鞋 拼色厚底女鞋 系带防水台女鞋子 GH852Q0红色 37,宏嘉男鞋专营店,9.79|9.80|9.74|9.76
10536835318,她芙 单鞋女2017春季新款中跟短靴女时尚女鞋性感尖头细跟单鞋深口裸靴防水台高跟鞋 黑色 37-标准码,卡曼鞋类专营店,9.72|9.75|9.65|9.63
11242420873,百芙蓉单鞋女中跟2017春季新款粗跟英伦风小皮鞋女春季新款圆头深口妈妈工作韩版潮厚底 70060黑色 36,百芙蓉鞋类旗舰店,9.88|9.81|9.83|9.84
11157498264,圆头深口低帮鞋2017年秋冬新款纯色系带坡跟女鞋防水台女鞋子 1343黑色 36,马登尔鞋靴专营店,9.78|9.81|9.75|9.76
10638093860,爱思图牛津鞋英伦风皮鞋女中跟秋季女鞋粗跟单鞋大头皮鞋圆头学生鞋小皮鞋平底鞋潮妈妈鞋女生鞋子 黑色ML6X303 36,爱思图旗舰店,9.72|9.76|9.71|9.70
10574081025,佩尼泰深口单鞋女头层牛皮尖头单鞋中跟粗跟 OL工作职业鞋大小码女鞋春季新款 灰色 38,佩尼泰旗舰店,9.68|9.73|9.67|9.66
10459020322,瑞蓓妮真皮女鞋2017新款魔术贴深口单鞋女平底舒适休闲鞋大码防滑中老年妈妈鞋 黑色单鞋 38,瑞蓓妮旗舰店,9.70|9.75|9.65|9.65
11273711543,细跟高跟鞋女2017春季新款尖头单鞋女深口高跟女士英伦厚底防水台工作女鞋 红色 37,家兴福鞋业专营店,9.87|9.82|9.80|9.81
11226902308,粗跟单鞋女2017春季新款女鞋OL尖头高跟鞋深口工作鞋女士皮鞋水钻百搭鞋子女 DH3658黑色 37,彬度鸟鞋靴旗舰店,9.89|9.83|9.83|9.84
11210447351,她芙 单鞋女2017春季新款单鞋粗跟女鞋子系带厚底高跟鞋深口学生休闲低帮鞋 绿色 37,她芙旗舰店,9.77|9.77|9.67|9.68
11239261516,AUSDU休闲鞋女圆头平底深口单鞋粗跟厚底2017春款韩版百搭舒适女鞋妈妈绑带学生 70030黑色 36,AUSDU鞋类旗舰店,9.87|9.80|9.81|9.82
11267204558,丹芭莎春季女鞋2017新品纯色深口鞋女韩版圆头高跟鞋粗跟防水台单鞋女潮鞋 M70050黑色 37,丹芭莎旗舰店,9.84|9.81|9.79|9.80
10687936751,fullmir内增高休闲鞋女士小白鞋2016秋季新款厚底鞋韩版潮流低帮学生运动鞋子单鞋 红 色 37,fullmir鞋类旗舰店,9.61|9.66|9.58|9.58
11167186789,新款单鞋女2017秋季时尚漆皮圆头低帮休闲鞋秋鞋 工作鞋套脚欧美低跟皮鞋 黑色6119 34,艾琳艺鞋类专营店,9.67|9.79|9.67|9.69
11227438800,意米思时尚女鞋圆头高跟鞋粗跟妈妈鞋深口单鞋女2017春秋新款韩版百搭小皮鞋防水台鞋子女 莫70050黑色 36,意米思旗舰店,9.72|9.81|9.79|9.80
11250120847,邻家天使细跟单鞋2017春季新款尖头欧美皮鞋深口高跟女鞋春秋款鞋子 LJ619黑色 39标码,邻家天使鞋类旗舰店,9.69|9.74|9.65|9.66
11193717829,单鞋女2017春季新款韩版高跟防水台粗跟女鞋尖头深口水钻通勤OL工作小皮鞋女 邻1231黑色 37,NEB ANGEL梓赢专卖店,9.78|9.78|9.74|9.75
11166169416,金丝兔尖头单鞋女2017春季新品深口金属超高跟鞋欧美时尚细跟女鞋百搭小皮鞋工作鞋 黑色 36,金丝兔广汇达专卖店,9.89|9.83|9.83|9.84
10617152040,ZHR小皮鞋真皮小白鞋女深口单鞋平底护士工作鞋潮 白色 39,零邦鞋靴专营店,9.69|9.68|9.69|9.69
1471841136,宝思特2017春季新款真皮平底平跟休闲女单鞋软牛皮软底妈妈鞋花朵跳舞鞋加大码女鞋子 黑色 39,宝思特旗舰店,9.75|9.74|9.65|9.65
11204372265,霍尔世家 深口单鞋女粗跟高跟鞋2017春季新款英伦风真皮尖头女鞋防水台 黑色 37,霍尔世家旗舰店,9.64|9.70|9.63|9.64
```

至此，我们完成了整个数据的爬取工作。

# 接下来的工作

有经验的读者可以看出来，本文完成的爬虫是较为基础的爬虫，不涉及到Scrapy高级的特性，也不涉及到反爬虫的内容，对于感兴趣的读者，可以从以下几个方面继续深入。
1. 由于京东对爬虫爬取评论并没有反爬措施，所以本文没有涉及到反爬的内容，不过在编写该爬虫的时候有考虑到这部分内容，所以编写了中间件来完成`User-Agent`的随机设置以及使用代理池来分散请求等简单的反爬措施，有兴趣的读者可以查阅Github源代码。
2. 对于较大的爬取工作，可以考虑使用`scrapy-redis`等工具来构建分布式爬虫，以增加爬取效率。
3. 在获得大量的数据之后，可以使用`matplotlib`等工具对数据进行可视化分析。

以上就是本文的全部内容，有兴趣的读者可以查阅Github并下载源码，该项目地址: [https://github.com/Time1ess/MyCodes/tree/master/scrapy/jd](https://github.com/Time1ess/MyCodes/tree/master/scrapy/jd)