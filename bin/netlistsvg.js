#!/usr/bin/env node
'use strict';

// 加载依赖
var lib = require('../built'),
    fs = require('fs'),
    path = require('path'),
    json5 = require('json5'),
    yargs = require('yargs'),
    Ajv = require('ajv');

// json 验证
var ajv = new Ajv({allErrors: true});
require('ajv-errors')(ajv);

// 命令行解析 
// argv._[0] = 输入的 JSON 文件
// argv.o = 输出的 SVG 文件（可选）
// argv.skin = 皮肤文件（SVG 模板）
// argv.layout = 额外的布局信息（ELK JSON 文件）
if (require.main === module) {
    var argv = yargs
        .demand(1)
        .usage('usage: $0 input_json_file [-o output_svg_file] [--skin skin_file] [--layout elk_json_file]')
        .argv;
    main(argv._[0], argv.o, argv.skin, argv.layout);
}

// 生成svg
function render(skinData, netlist, outputPath, elkData) {
    lib.render(skinData, netlist, (err, svgData) => {
        if (err) throw err;
        fs.writeFile(outputPath, svgData, 'utf-8', (err) => {
            if (err) throw err;
        });
    }, elkData);
}

// 解析 JSON 文件
function parseFiles(skinPath, netlistPath, elkJsonPath, callback) {
    fs.readFile(skinPath, 'utf-8', (err, skinData) => {
        if (err) throw err;
        // 网表数据存入 netlistData
        fs.readFile(netlistPath, (err, netlistData) => {
            if (err) throw err;
            if (elkJsonPath) {
                fs.readFile(elkJsonPath, (err, elkString) => {
                    callback(skinData, netlistData, json5.parse(elkString));
                });
            } else {
                callback(skinData, netlistData);
            }
        });
    });
}

// netlistPath 网表信息
// outputPath 输出文件路径
function main(netlistPath, outputPath, skinPath, elkJsonPath) {
    skinPath = skinPath || path.join(__dirname, '../lib/default.svg');
    outputPath = outputPath || 'out.svg';
    var schemaPath = path.join(__dirname, '../lib/yosys.schema.json5');
    parseFiles(skinPath, netlistPath, elkJsonPath, (skinData, netlistString, elkData) => {
        var netlistJson = json5.parse(netlistString);  // 读取json网表

        // console.log("=== Parsed Netlist JSON (Formatted) ===");
        // console.log(JSON.stringify(netlistJson, null, 2));  // 打印格式化 JSON

        // 验证是否符合 schemaPath '../lib/yosys.schema.json5' 规则
        var valid = ajv.validate(json5.parse(fs.readFileSync(schemaPath)), netlistJson);
        if (!valid) {
            throw Error(JSON.stringify(ajv.errors, null, 2));
        }
        // 生成svg存入 outputPath
        render(skinData, netlistJson, outputPath, elkData);
    });
}

module.exports.main = main;
