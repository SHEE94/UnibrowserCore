# 快速入门

## 引入文件

将SDK放置在根目录下，SDK包含两个文件夹，libs和static文件

引入主文件
```
import { WebView } from '@/libs/browser.core.js'
```

实例化webview

```
const webview = new WebView()
```

可以将webview设置为全局变量，方便全局调用

创建窗口

```
webview.openNewWindow(url, this);
```

调用 ``` openNewWindow ```方法打开一个新窗口，``` url ```要打开的地址，``` this ```指的是要将webview插入的页面或组件的上下文

设置当前显示的窗口大小，默认全屏，如果想设置后台窗口，可以通过```webview.webviews```属性获取所有的窗口进行单独设置
``` 
webview.setStyle({height:100,width:100})

```
你已成功创建第一个浏览器了。


## 联系作者

 如果想请作者喝杯咖啡可以加作者QQ：549859890
 
 如果想了解最新开发进度可以加QQ群：326734794

[详细文档地址](https://github.com/SHEE94/UnibrowserCore/wiki)
[项目地址](https://github.com/SHEE94/UnibrowserCore)