# makit-plugin
![Language](https://img.shields.io/badge/-TypeScript-blue.svg)
[![Build Status](https://travis-ci.org/searchfe/makit-plugin.svg?branch=master)](https://travis-ci.org/searchfe/makit-plugin)
[![Coveralls](https://img.shields.io/coveralls/searchfe/makit-plugin.svg)](https://coveralls.io/github/searchfe/makit-plugin)
[![npm package](https://img.shields.io/npm/v/makit-plugin.svg)](https://www.npmjs.org/package/makit-plugin)
[![npm downloads](http://img.shields.io/npm/dm/makit-plugin.svg)](https://www.npmjs.org/package/makit-plugin)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

makit-plugin

## Install

```bash
npm i makit-plugin --save-dev

```

## Get Start

makit-plugin 为基于 [makit](https://github.com/searchfe/makit) 的构建项目提供plugin的recipe封装，适用于中大型项目构建；同时提供部分必要的plugin（暂时性）。

### RecipeFactory && recipeImpl

**参数传递** 可以通过RecipeFactory向recipeImpl传递一些参数，避免在repice中耦合业务代码

```
const comp = process.env.compress;

const recipe = RecipeFactory(recipeImpl, {key: '$1'});

rule(`(**/*).min.js`, `/$1.js`, RecipeFactory(recipeImpl, {
    comp,
}));

function recipeImpl({target, dep, comp}) {}
```

**反向引用** 可以在recipeImpl的options中的字符串参数中引用rule匹配到的字符串($0~$9)

```
const recipe = RecipeFactory(recipeImpl, {key: '$1'});

rule(`(**/*).min.js`, `/$1.js`, recipe);

function recipeImpl({target, dep, key}) {
    // target   frame.min.js
    // dep      frame.js
    // key      frame
}
```

**配置** RecipeFactory可以接受一个配置集合，当recipeImpl执行前，符合target的配置会被选中，将传给recipeImpl。这样，recipe可以实现一些文件粒度的差异化配置


```
const configs = [{
    file: 'static/**.js',
    compress: true
}, {
    file: 'static/**.min.js',
    compress: false
}];

const recipe = RecipeFactory(recipeImpl, {key: '$1', ...dynamicOption}, configs);

rule(`(**/*).js`, `${src}/$1.js`, recipe);
```

### recipe

[compress](https://searchfe.github.io/makit-plugin/modules/_recipe_compress_.html)

[css](https://searchfe.github.io/makit-plugin/modules/_recipe_css_.html)

[hash](https://searchfe.github.io/makit-plugin/modules/_recipe_hash_.html)

[inline-js](https://searchfe.github.io/makit-plugin/modules/_recipe_inline_js_.html)

[map](https://searchfe.github.io/makit-plugin/modules/_recipe_map_.html)

[parse-js](https://searchfe.github.io/makit-plugin/modules/_recipe_parse_js_.html)

[san](https://searchfe.github.io/makit-plugin/modules/_recipe_san_.html)

[tpl](https://searchfe.github.io/makit-plugin/modules/_recipe_tpl_.html)

[wrap](https://searchfe.github.io/makit-plugin/modules/_recipe_wrap_.html)


[deploy](https://searchfe.github.io/makit-plugin/modules/_recipe_deploy_.html)

### utils

[async-replace](https://searchfe.github.io/makit-plugin/modules/_utils_async_replace_.html)

[entry](https://searchfe.github.io/makit-plugin/modules/_utils_entry_.html)

## API

[API DOC](https://searchfe.github.io/makit-plugin/)
