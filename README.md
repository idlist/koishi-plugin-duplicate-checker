# koishi-plugin-duplicate-checker

[![npm](https://img.shields.io/npm/v/koishi-plugin-duplicate-checker?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-duplicate-checker)
[![npm-download](https://img.shields.io/npm/dw/koishi-plugin-duplicate-checker?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-duplicate-checker)

火星图文出警器。

## 安装方法

```shell
npm i koishi-plugin-duplicate-checker
```

然后在配置文件或入口文件中将插件添加至你的机器人中。

### 关于安装时出现“找不到 Python”之类的一系列问题

请参照 [sharp 的文档](https://sharp.pixelplumbing.com/install#chinese-mirror) 设置镜像源。理论上而言，安装此插件不需要事先安装 Python。

## 使用方法

这个插件的主要功能为纯被动触发，配置后即可使用。

同时，插件内置了两个用于管理状态的隐藏指令，使用 `-help dplch` 可以在 bot 内查看帮助。

#### `dplch.now`

查看当前的统计数据与消息记录情况。

#### `dplch.reset`

需要 4 级权限。

重置统计数据和火星消息记录表。

## 插件配置项

这个插件无需任何配置项即可使用，同时也提供了一些可能会用到的配置项。一些不太可能会用到的配置项就摸了。你也可以在配置时借助 JSDoc 自行查看。

| 配置项 | 默认值 | 说明 |
| - | - | - |
| `calloutSelf` | `false` | 消息发送者自己发送了两次的情况下是否需要出警。 |
| `maxCallout` | 10 | 最大出警次数。能够用于减少对于表情包的出警频率。 |
| `cooldown` | 300 | 对同一条火星消息出警的冷却时间，单位为秒。第一次出警不受此配置项影响。 |
| `calloutText` | `true` | 是否对文字消息进行出警。 |
| `minTextLength` | 128 | 被记录的文字信息的最小长度。只有长于此长度的文字信息才会被记录。 |
| `minWidth` | 512 | 被记录的图片信息的最小宽度，单位为像素（px）。 |
| `minHeight` | 512 | 被记录的图片信息的最小高度，单位为像素（px）。 |
| `expireDuration` | 259200 | 被记录的消息的储存时长，单位为秒。 |
| `cleanExpireInterval` | 3600 | 清理过期消息的间隔，单位为秒。 |

## 已知问题

这个插件完全依赖于内存储存，所以随着运行时间的增长，这个插件占用的内存也会随之增加，而且可能还有内存泄露问题。

这个插件使用了一个 JSON 文件 `cache.json`（而不是数据库）在退出 Koishi 时储存消息记录，同时因为作者技术力低下，偶尔会出现储存文件丢失的情况。

## 更新记录

<details>
<summary><b>v2</b></summary>

### v2.0.1

- 修复了一个单位换算错误。

### v2.0.0

- 更换了配置项的格式，现在能在网页控制台设置这些配置了。

</details>

<details>
<summary><b>v1</b> （用于 Koishi v4）</summary>

### v1.1.2

- 将 sharp 升级到 v0.30.6（低于 v0.30.4 （含）的 sharp 报有安全性问题）。

### v1.1.1

- 修复了一个逻辑错误。

### v1.1.0

- 更换了依赖链（换到了 [sharp](https://sharp.pixelplumbing.com/)），导致依赖的数量和体积增加了，好处是扔掉了一些远古依赖。
- 在终止机器人时，插件会将当前的记录写入本地 JSON 文件，在下次启动时将读取该文件以实现重启不丢数据的功能。

### v1.0.1

- 删除了链接分类（实际上根本就没有实装过），修复了清理记录的时候出错的问题。

### v1.0.0

- 对 v4 做了一个很简陋的适配。如果仍然需要在 v3 中使用此插件，请使用 v0.2 版本。

</details>