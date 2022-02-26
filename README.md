# koishi-plugin-duplicate-checker

[![npm](https://img.shields.io/npm/v/koishi-plugin-duplicate-checker?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-duplicate-checker)
[![npm-download](https://img.shields.io/npm/dw/koishi-plugin-duplicate-checker?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-duplicate-checker)

火星图文出警器。

## 安装方法

```shell
npm i koishi-plugin-duplicate-checker
```

然后在配置文件或入口文件中将插件添加至你的机器人中。

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
| `minTextLength` | 128 | 被记录的文字信息的最小长度。只有长于此长度的文字信息才会被记录。 |
| `minWidth` | 512 | 被记录的图片信息的最小宽度，单位为像素（px）。 |
| `minHeight` | 512 | 被记录的图片信息的最小高度，单位为像素（px）。 |
| `expireDuration` | `{ days: 3 }` **\*1** | 被记录的消息的储存时长。 |
| `cleanExpireInterval` | `{ minutes: 10 }` **\*1** | 清理过期消息的间隔。 |
| `cooldown` | `{ minutes: 5 }` **\*1** | 对同一条火星消息出警的冷却时间。第一次出警不受此配置项影响。 |

**\*1** 这些关于时间的配置项遵循以下的格式。

```ts
interface DurationObject {
  ms?: number
  millisecond?: number
  milliseconds?: number  // 毫秒
  second: number
  seconds?: number       // 秒
  minute?: number
  minutes?: number       // 分钟
  hour?: number
  hours?: number         // 小时
  day?: number
  days?: number          // 日
}
```

## 已知问题

这个插件完全依赖于内存储存，所以随着运行时间的增长，这个插件占用的内存也会随之增加，而且可能还有内存泄露问题。我自己用的情况是这个插件在加了 20 个群的情况下能吃掉大约 300M 的内存。

## 更新记录

### v1.1.1

- 修复了一个 LTGM 报的逻辑错误。

### v1.1.0

- 更换了依赖链（换到了 [sharp](https://sharp.pixelplumbing.com/)），总体依赖的数量和体积增加，好处是扔掉了一些远古依赖。
- 在终止机器人时，插件会将当前的记录写入本地 JSON 文件，在下次启动时将读取该文件以实现重启不丢数据的功能。

### v1.0.1

- 删除了链接分类（实际上根本就没有实装过），修复了清理记录的时候出错的问题。

### v1.0.0

- 对 v4 做了一个很简陋的适配。如果仍然需要用 v3 请使用 v0.2 版本。