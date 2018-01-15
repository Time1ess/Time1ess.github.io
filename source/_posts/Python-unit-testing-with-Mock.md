---
title: 在Python中使用mock进行单元测试
date: 2018-01-15 09:07:28
tags: [Python,单元测试,mock]
categories: Python
---

在最近开发的项目中进行了单元测试，在测试过程中使用到了`Python 3.3`中加入到标准库的`mock`库(`unittest.mock`)，因此将使用心得整理成一篇博文。

<!-- more -->

`mock`是一个Python中帮助用来提高单元测试效率的工具，在`Python 3.3`之前需要自行安装，`Python 3.3`将`mock`引入了标准库。单元测试的基本思想是测试逻辑集中的一小段函数，但是在实际编程中，随着开发的进行，可能函数之间有相互调用，对当前函数的单元测试不应该受到被调用函数的影响，因此如何屏蔽掉调用函数的影响而单独测试当前函数是必要的，原因有很多:

* 被调用函数的调用可能产生不必要的问题，如调用生产接口
* 被调用函数的调用过程可能是复杂的，普通的调用无法覆盖所有可能发生的结果
* 被调用函数的调用条件比较复杂，如需额外搭建服务器等

以上种种，都会使得单元测试的开发效率降低，因此，`Python 3.3`引入了`mock`来简化这些问题。让我们首先来看一个小例子:


```Python
import json
import requests


def retrieve_url(url):
    resp = requests.get(url)
    return resp.content

def download_and_parse_json(url):
    try:
        content = retrieve_url(url)
    except Exception as e:
        return '[ERROR] ' + str(e)
    data = json.loads(content)
    return data

json_url = 'http://www.foo.com/bar'  # Return json response

data = download_and_parse_json(json_url)
print('Parsed:', data)
```

这段代码中我们编写了两个函数，一个是用来请求url获取响应的函数`retrieve_url`，一个用来下载url内容并尝试解析为`json`格式函数`download_and_parse_json`，假设我们有一个链接`json_url`，该链接正常情况下应该返回一个包含`json`数据的响应，但是在各种环境因素的作用下(网络通信中断，服务器宕机，接口失效)，也可能出现访问失败的情况，因此我们的第二个函数加入了简单的异常处理，在正常情况下返回解析的`json`字典，异常情况下返回错误信息。

# patch

如果我们想在开发过程中对该函数(`download_and_parse_json`)进行单元测试，由于`json_url`对应的接口可能存在前文所说的各种可能原因，因此我们想模拟该部分操作，返回一个`json`格式的字符串或者抛出一个异常，这时候`mock`模块就派上用场了:

```Python
import json
import requests

from unittest.mock import patch


def retrieve_url(url):
    resp = requests.get(url)
    return resp.content

def download_and_parse_json(url):
    try:
        content = retrieve_url(url)
    except Exception as e:
        return '[ERROR] ' + str(e)
    data = json.loads(content)
    return data

json_url = 'http://www.foo.com/bar'  # Return json response

with patch('__main__.retrieve_url') as mocked_retrieve:
    mocked_retrieve.return_value = '{"a":1,"b":[1,3,4]}'
    data = download_and_parse_json(json_url)
    print('Parsed:', data)

with patch('__main__.retrieve_url') as mocked_retrieve:
    mocked_retrieve.side_effect = requests.exceptions.ConnectionError(
        'Connection Error')
    data = download_and_parse_json(json_url)
    print('Parsed:', data)
```

注意该段代码和前一段代码的区别，我们首先从`unittest.mock`导入了`patch`，`patch`可作为函数装饰器、类装饰器、上下文管理器使用，而此处我们使用了第三种形式——上下文管理器。`patch`函数至少接收一个参数，即需要模拟的对象的导入路径，如`package.module.ClassName`，此处我们使用了`__main__.retrieve_url`指示了顶层执行代码中的`retrieve_url`函数，当作为上下文管理器使用的时候，`patch`会返回一个`MagicMock`对象，`MagicMock`是`Mock`的子类(关于`Mock`在下一节会介绍)。

经过`patch`后，在上下文作用域里面，`retireve_url`就已经被替换了，因此我们接下来只需要模拟该函数在正常情况下以及非正常情况下的运行结果就行了。

1. 第一个`with`语句中，我们设置了`mocked_retrieve.return_value = '{"a":1,"b":[1,3,4]}'`，即当该mock对象被调用的时候(执行`content = retrieve_url(url)`的时候)将返回我们设置的属性`return_value`的值，此处即一个`json`字符串。
2. 第二个`with`语句中，我们设置了`mocked_retrieve.side_effect = requests.exceptions.ConnectionError('Connection Error')`，在`mock`被调用的时候将抛出`ConnectionError`以测试异常捕获相关代码，与`return_value`只能设置成一个值不同，`side_effect`支持赋值一个函数、一个迭代器或者一个异常(类或对象)。
	* 函数: 函数将接收与被mock对象相同的参数(如果函数返回`mock.DEFAULT`对象或者不设置函数，`mock`对象将会返回`return_value`)
	* 迭代器: 在每次`mock`被调用的时候，将依次逐个返回迭代器中的值
	* 异常: 调用`mock`的时候将抛出指定异常

<div class="tip">
当`patch`作为函数装饰器使用的时候，被创建的`MagicMock`对象将会作为额外参数传给被装饰函数。(关键字参数new没有被指定的情况下)
</div>

# Mock

前文已经提到了`Mock`与`MagicMock`，那么它们到底有什么作用呢？

简单来说，`Mock`是一类特殊的对象，当访问该类对象上任意不存在的属性的时候，该属性将被自动创建，且该属性也是`Mock`对象，来看一个小例子:

```Python
>>> from unittest.mock import Mock
>>> m = Mock()
>>> m.foo
<Mock name='mock.foo' id='4404473248'>
>>> m.bar.return_value = 'hello mock'
>>> print(m.bar())
'hello mock'
```

`m`是一个`Mock`对象，当访问`m`的`foo`属性时，一个新的`Mock`对象被创建了，我们可以使用链式调用来给`Mock`对象添加任意属性，以及设置调用返回值。

官方文档中给出的`Mock`的创建参数如下:

```
class unittest.mock.Mock(spec=None, side_effect=None, return_value=DEFAULT, wraps=None, name=None, spec_set=None, unsafe=False, **kwargs)
```

在实际使用中，目前就使用到了前三者`spec`、`side_effect`、`return_value`，后两者在前文已经介绍到了，这里简单介绍下`spec`参数，该参数用来限制可以被`Mock`的属性的范围，`spec`可以是多个字符串的列表或者一个已存在的对象(类或实例)，当访问`spec`参数指定属性以外属性的时候将抛出`AttributeError`。

`MagicMock`是`Mock`的子类，因此其拥有所有父类的表现，除此之外，使用该子类允许我们很方便的对`magic methods`进行设置，例如:

```Python
>>> from unittest.mock import MagicMock
>>> m = MagicMock()
>>> m.__str__.return_value = 'hello mock'
>>> print(m)
hello mock
```

## 方法与属性

`Mock`对象实现了很多有用的方法以及属性方便开发者在进行单元测试时使用。

* `assert_called`: 用来检验`Mock`对象至少有一次被调用
	```Python
	>>> mock = Mock()
	>>> mock.method()
	<Mock name='mock.method()' id='...'>
	>>> mock.method.assert_called()
	```
* `assert_called_once`: 用来检验`Mock`对象恰好有一次被调用
* `call_count`: 用来表示`Mock`被调用次数
   ```Python
   >>> mock = Mock(return_value=None)
	>>> mock.call_count
	0
	>>> mock()
	>>> mock()
	>>> mock.call_count
	2
   ```
* ...