// worker/src/namumark-parser.js
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var urlPas = (data) => {
  return encodeURIComponent(data.replace(/^\./g, "\\\\.")).replaceAll("/", "%2F");
};
function sha224Replace(data) {
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const value = Math.imul(hash ^ 2654435769 * (i + 1), 2246822507);
    parts.push((value >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 56);
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}
function unescapeHtml(html) {
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
}
var globalRegExp = (regexp) => new RegExp(regexp, "g");
var v4 = () => crypto.randomUUID();
var skinUseConfig = [
  "useStrike",
  "useBold",
  "useCategorySet",
  "useCategoryChangeTitle",
  "useFootnoteSet",
  "useFootnoteNumber",
  "useViewRealFootnoteNum",
  "useIncludeLink",
  "useImageSet",
  "useTocSet",
  "useExterLink",
  "useLinkDelimiter",
  "useCssDarkmode",
  "useTableScroll",
  "useTableTransparent",
  "useListViewChange",
  "useViewJoke",
  "useMathScroll",
  "useViewHistory",
  "useFontSize",
  "useMonaco"
];
function splitSafeExpression(input, operator) {
  const parts = [];
  let quote = "";
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= input.length - operator.length; i++) {
    const char = input[i];
    if (quote) {
      if (char === quote && input[i - 1] !== "\\") quote = "";
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === "(") {
      depth++;
      continue;
    }
    if (char === ")") {
      depth--;
      continue;
    }
    if (depth === 0 && input.slice(i, i + operator.length) === operator) {
      parts.push(input.slice(start, i).trim());
      start = i + operator.length;
      i += operator.length - 1;
    }
  }
  if (!parts.length) return [input.trim()];
  parts.push(input.slice(start).trim());
  return parts;
}
function evaluateSafeNamuIf(expression, pageName) {
  const source = String(expression || "").trim();
  if (!source || source.length > 500) return false;
  const stripOuter = (input) => {
    let value = input.trim();
    while (value.startsWith("(") && value.endsWith(")")) {
      let depth = 0, quote = "", closesAtEnd = false;
      for (let i = 0; i < value.length; i++) {
        const ch = value[i];
        if (quote) {
          if (ch === quote && value[i - 1] !== "\\") quote = "";
          continue;
        }
        if (ch === "'" || ch === '"') {
          quote = ch;
          continue;
        }
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (depth === 0) {
          closesAtEnd = i === value.length - 1;
          break;
        }
      }
      if (!closesAtEnd) break;
      value = value.slice(1, -1).trim();
    }
    return value;
  };
  const valueOf = (raw) => {
    const value = stripOuter(raw);
    if (/^(docName|title|pagename)$/i.test(value)) return pageName;
    if (/^true$/i.test(value)) return true;
    if (/^false$/i.test(value)) return false;
    if (/^null$/i.test(value)) return null;
    if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
    const stringMatch = value.match(/^(['"])([\s\S]*)\1$/);
    if (stringMatch) return stringMatch[2];
    return void 0;
  };
  const evaluate = (raw, depth = 0) => {
    if (depth > 16) return false;
    const value = stripOuter(raw);
    const ors = splitSafeExpression(value, "||");
    if (ors.length > 1) return ors.some((part) => evaluate(part, depth + 1));
    const ands = splitSafeExpression(value, "&&");
    if (ands.length > 1) return ands.every((part) => evaluate(part, depth + 1));
    if (value.startsWith("!") && !value.startsWith("!=")) return !evaluate(value.slice(1), depth + 1);
    const comparison = value.match(/^([\s\S]+?)\s*(===|!==|==|!=|>=|<=|>|<)\s*([\s\S]+)$/);
    if (comparison) {
      const left = valueOf(comparison[1]), right = valueOf(comparison[3]), op = comparison[2];
      if (left === void 0 || right === void 0) return false;
      if (op === "===" || op === "==") return left === right;
      if (op === "!==" || op === "!=") return left !== right;
      if (typeof left !== "number" || typeof right !== "number") return false;
      if (op === ">") return left > right;
      if (op === "<") return left < right;
      if (op === ">=") return left >= right;
      return left <= right;
    }
    const literal = valueOf(value);
    return literal === true || literal === 1 || typeof literal === "string" && literal.length > 0;
  };
  return evaluate(source);
}
var NamuMark = class _NamuMark {
  constructor(wikiText, config, database, doType = "exter") {
    __publicField(this, "renderData", "");
    __publicField(this, "dataTempStorage", {});
    __publicField(this, "dataTempStorageCount", 0);
    __publicField(this, "dataInclude", []);
    __publicField(this, "dataBacklink", {});
    __publicField(this, "dataMathCount", 0);
    __publicField(this, "dataToc", "");
    __publicField(this, "dataFootnoteAll", {});
    __publicField(this, "dataFootnote", {});
    __publicField(this, "dataCategory", "");
    __publicField(this, "dataCategoryList", []);
    __publicField(this, "docData", "");
    __publicField(this, "docName", "");
    __publicField(this, "docSet");
    __publicField(this, "config");
    __publicField(this, "renderDataJS", "");
    __publicField(this, "darkmode", "0");
    __publicField(this, "database");
    __publicField(this, "tempALinkCount");
    __publicField(this, "doType");
    __publicField(this, "linkCount", 0);
    __publicField(this, "afterwork", []);
    __publicField(this, "getToolDataStorage", (dataA = "", dataB = "", dataC = "", doType2 = "render") => {
      this.dataTempStorageCount += 1;
      let dataName;
      if (doType2 === "render") {
        dataName = "render_" + this.dataTempStorageCount + this.docSet["docInclude"];
        this.dataTempStorage[dataName] = dataA;
        this.dataTempStorage["/" + dataName] = dataB;
        this.dataTempStorage["revert_" + dataName] = dataC;
      } else {
        dataName = "slash_" + String(this.dataTempStorageCount) + this.docSet["docInclude"];
        this.dataTempStorage[dataName] = dataA;
      }
      return dataName;
    });
    __publicField(this, "getToolDataRestore", (data, doType2 = "all") => {
      let storageCount = this.dataTempStorageCount * 3;
      const storageRegex = doType2 === "all" ? /<(\/?(?:render|slash)_(?:[0-9]+)(?:[^<>]+))>/ : doType2 === "render" ? /<(\/?(?:render)_(?:[0-9]+)(?:[^<>]+))>/ : /<(\/?(?:slash)_(?:[0-9]+)(?:[^<>]+))>/;
      while (true) {
        if (!data.match(storageRegex)) break;
        if (storageCount < 0) {
          console.log("Error: render restore count overflow");
          break;
        } else {
          data = data.replace(storageRegex, (match, p1) => this.dataTempStorage[p1]);
        }
        storageCount -= 1;
      }
      return data;
    });
    __publicField(this, "getToolDataRevert", (data, doType2 = "all") => {
      let storageCount = this.dataTempStorageCount * 3;
      const storageRegex = doType2 === "all" ? /(?:<((slash)_(?:[0-9]+)(?:[^<>]+))>|<((render)_(?:[0-9]+)(?:[^<>]+))>(?:(?:(?!<(?:\/?render_(?:[0-9]+)(?:[^<>]+))>).|\n)*)<\/render_(?:[0-9]+)(?:[^<>]+)>)/ : doType2 === "render" ? /<((render)_(?:[0-9]+)(?:[^<>]+))>(?:(?:(?!<(?:\/?render_(?:[0-9]+)(?:[^<>]+))>).)*)<\/render_(?:[0-9]+)(?:[^<>]+)>/ : /<((slash)_(?:[0-9]+)(?:[^<>]+))>/;
      while (true) {
        const match = data.match(storageRegex);
        if (!match) break;
        if (storageCount < 0) {
          console.log("Error: render restore count overflow");
          break;
        } else {
          let matchGroups = match.slice(1);
          let dataRevert;
          if (matchGroups[1] && matchGroups[1] === "render") {
            dataRevert = this.dataTempStorage[`revert_${matchGroups[0]}`] || "";
          } else {
            if (matchGroups.length > 3 && matchGroups[3] === "render") {
              dataRevert = this.dataTempStorage[`revert_${matchGroups[2]}`] || "";
            } else {
              dataRevert = `\\${this.dataTempStorage[matchGroups[0]]}`;
            }
          }
          data = data.replace(storageRegex, dataRevert);
        }
        storageCount -= 1;
      }
      data = data.replace(/<front_br>/g, "");
      data = data.replace(/<back_br>/g, "");
      return data;
    });
    __publicField(this, "getToolCssSafe", (data) => {
      return data.replaceAll(";", "");
    });
    __publicField(this, "getToolJSSafe", (data) => {
      data = data.replaceAll("\n", "\\\\n");
      data = data.replaceAll("\\", "\\\\");
      data = data.replaceAll("'", "\\'");
      data = data.replaceAll('"', '\\"');
      return data;
    });
    __publicField(this, "getToolDarkModeSplit", (data) => {
      const dataNew = data.split(",");
      if (dataNew.length === 1) return dataNew[0];
      else {
        if (this.darkmode === "0") return dataNew[0];
        else return dataNew[1];
      }
    });
    __publicField(this, "getToolThemeColorStyle", (property, kind, data) => {
      const values = splitSafeExpression(String(data || ""), ",").map((value) => value.trim()).filter(Boolean);
      const isColor = (value) => /^(?:#[0-9a-f]{3,8}|[a-z]{1,24}|(?:rgba?|hsla?)\([\d.%+\-/ ,]+\))$/i.test(value);
      if (!values.length || !values.every(isColor)) return "";
      if (values.length === 1) {
        if (property === "border") return "border:2px solid " + values[0] + ";";
        return property + ":" + values[0] + ";";
      }
      const [light, dark] = values;
      const prefix = "\\2d \\2d aonwiki-table-" + kind;
      const base = property === "border" ? "2px solid " + light : light;
      return prefix + "-light:" + light + ";" + prefix + "-dark:" + dark + ";" + property + ":" + base + ";";
    });
    this.doType = doType;
    this.renderData = wikiText.replace("\r", "");
    if (doType === "exter") {
      this.renderData = escapeHtml(this.renderData);
    }
    this.renderData = "<back_br>\n" + this.renderData + "\n<front_br>";
    this.docSet = { docInclude: v4().replaceAll("-", "") + "_", docType: config.docType || "view" };
    for (const key of skinUseConfig) {
      const value = config[key];
      if (!value) {
        config[key] = "default";
      }
    }
    config.useTocSet = "default";
    this.config = config;
    this.database = database;
    this.docName = String(config.docName || "");
  }
  getToolDatabaseFind(title) {
    const lookup = this.database.lookup;
    if (lookup instanceof Map) return lookup.get(title);
    return (this.database.data || []).find((value) => value?.title === title);
  }
  getToolPxAddCheck(data) {
    if (data.match(/^[0-9]+$/)) return data + "px";
    else return data;
  }
  getToolFootnoteMake() {
    let data = "";
    for (const forA in this.dataFootnote) {
      if (data === "") {
        data += '<div class="opennamu_footnote" style="font-size:12px !important;line-height:1.6 !important;">';
      } else {
        data += "<br>";
      }
      if (this.dataFootnote[forA]["list"].length > 1) {
        data += `(${forA}) `;
        for (const forB of this.dataFootnote[forA]["list"]) {
          data += '<sup><a id="' + this.docSet["docInclude"] + "fn_" + forB + '" href="#' + this.docSet["docInclude"] + "rfn_" + forB + '">(' + forB + ")</a></sup> ";
        }
      } else {
        data += '<a id="' + this.docSet["docInclude"] + "fn_" + this.dataFootnote[forA]["list"][0] + '" href="#' + this.docSet["docInclude"] + "rfn_" + this.dataFootnote[forA]["list"][0] + '">(' + forA + ") </a> ";
      }
      data += '<footnote_title style="font-size:12px !important;line-height:1.6 !important;" id="' + this.docSet["docInclude"] + "fn_" + this.dataFootnote[forA]["list"][0] + '_title">' + this.dataFootnote[forA]["data"] + "</footnote_title>";
    }
    if (data !== "") {
      data += "</div>";
    }
    this.dataFootnoteAll = { ...this.dataFootnoteAll, ...this.dataFootnote };
    this.dataFootnote = {};
    return data;
  }
  getToolLinkFix(linkMain, doType = "link") {
    if (doType === "link") {
      if (linkMain === "../") {
        linkMain = this.docName;
        linkMain = linkMain.replace(/(\/[^/]+)$/g, "");
      } else if (linkMain.match(/^\//g)) {
        linkMain = linkMain.replace(/^\//g, this.docName + "/");
      } else if (linkMain.match(/^:(분류|category):/gi)) {
        linkMain = linkMain.replace(/^:(분류|category):/gi, "category:");
      } else if (linkMain.match(/^:(파일|file):/gi)) {
        linkMain = linkMain.replace(/^:(파일|file):/gi, "file:");
      } else if (linkMain.match(/^사용자:/gi)) {
        linkMain = linkMain.replace(/^사용자:/gi, "user:");
      }
    } else {
      if (linkMain === "../") {
        linkMain = this.docName;
        linkMain = linkMain.replace(/(\/[^/]+)$/g, "");
      } else if (linkMain.match(/^분류:/g)) {
        linkMain = linkMain.replace(/^분류:/g, "category:");
      } else if (linkMain.match(/^사용자:/g)) {
        linkMain = linkMain.replace(/^사용자:/g, "user:");
      }
    }
    return linkMain;
  }
  doInterRender(data, docInclude) {
    const docSet = { ...this.docSet };
    docSet["docInclude"] = docInclude;
    const dataEnd = new _NamuMark(data, { docName: this.docName }, this.database, "inter").parse();
    this.renderDataJS += dataEnd[1];
    this.dataCategoryList.push(...dataEnd[2]["category"]);
    this.dataBacklink = { ...this.dataBacklink, ...dataEnd[2]["backlink_dict"] };
    this.dataTempStorage = { ...this.dataTempStorage, ...dataEnd[2]["temp_storage"][0] };
    this.dataTempStorageCount += dataEnd[2]["temp_storage"][1];
    this.linkCount += dataEnd[2]["link_count"];
    return dataEnd[0];
  }
  manageRemark() {
    this.renderData = this.renderData.replace(/\n##[^\n]+/g, "\n<front_br>");
  }
  manageIncludeDefault() {
    const handler = (match, p1, p2, p3) => {
      const matches = [p1, p2, p3];
      if (typeof matches[2] === "number") {
        matches[2] = "";
      }
      if (matches[2] === "\\") {
        return match;
      } else {
        let slashAdd = "";
        if (matches[0]) {
          if (matches[0].length % 2 === 1) {
            slashAdd = "\\".repeat(matches[0].length - 1);
          } else {
            slashAdd = matches[0];
          }
        }
        return slashAdd + matches[2];
      }
    };
    this.renderData = this.renderData.replace(/(\\+)?@([ㄱ-힣a-zA-Z0-9_]+)=((?:\\@|[^@\n])+)@/g, handler);
    this.renderData = this.renderData.replace(/(\\+)?@([ㄱ-힣a-zA-Z0-9_]+)@/g, handler);
  }
  // re.sub fix
  manageInclude() {
    let includeNum = 0;
    const useIncludeLink = this.config.useIncludeLink;
    const includeRegex = /\[include\(((?:(?!\[include\(|\)\]|<\/div>).)+)\)\](\n?)/i;
    let includeCountMax = (this.renderData.match(globalRegExp(includeRegex)) || []).length * 10;
    while (true) {
      includeNum += 1;
      const includeChangeList = {};
      let includeMatch = this.renderData.match(includeRegex);
      if (includeCountMax < 0) {
        break;
      } else if (!includeMatch) {
        break;
      }
      if (this.docSet["docType"] === "include") {
        this.renderData = this.renderData.replace(includeRegex, "");
        includeCountMax -= 1;
        continue;
      }
      const matchOrg = includeMatch[0];
      let match = includeMatch.slice(1);
      const macroSplitRegex = /(?:^|,) *([^,]+)/g;
      const macroSplitSubRegex = /^([^=]+) *= *(.*)$/;
      let includeName = "";
      let matches;
      const data = [];
      while ((matches = macroSplitRegex.exec(match[0])) !== null) {
        data.push(matches[1]);
      }
      for (const datum of data) {
        const dataSubMatch = datum.match(macroSplitSubRegex);
        if (dataSubMatch) {
          const dataSub = dataSubMatch.slice(1);
          const dataSubName = dataSub[0];
          let dataSubData = this.getToolDataRestore(dataSub[1], "slash");
          dataSubData = escapeHtml(dataSubData);
          dataSubData = dataSubData.replace(/^(?<in>분류|category):/g, ":$<in>:");
          dataSubData = dataSubData.replace(/^(?<in>파일|file):/g, ":$<in>:");
          includeChangeList[dataSubName] = dataSubData;
        } else {
          includeName = datum;
        }
      }
      const includeNameOrg = includeName;
      includeName = this.getToolDataRestore(includeName, "slash");
      includeName = escapeHtml(includeName);
      if (!this.dataBacklink[includeName]) {
        this.dataBacklink[includeName] = {};
      }
      this.dataBacklink[includeName]["include"] = "";
      const result = this.getToolDatabaseFind(includeName);
      let dataName;
      if (result) {
        let includeLink = "";
        if (useIncludeLink === "use") {
          includeLink = '<div><a href="/w/' + urlPas(includeName) + '">(' + includeNameOrg + ")</a></div>";
        }
        const includeSubName = this.docSet["docInclude"] + "opennamu_include_" + includeNum;
        this.renderDataJS += 'opennamu_do_include("' + this.getToolJSSafe(includeName) + '", "' + this.getToolJSSafe(this.docName) + '", "' + this.getToolJSSafe(includeSubName) + '", "' + this.getToolJSSafe(includeSubName) + '");\n';
        const handler = () => {
          return (match2, p1, p2, p3) => {
            const matches2 = [p1, p2, p3];
            if (typeof matches2[2] === "number") {
              matches2[2] = "";
            }
            if (matches2[2] === "\\") {
              return match2;
            } else {
              let slashAdd = "";
              if (matches2[0]) {
                if (matches2[0].length % 2 === 1) {
                  slashAdd = "\\".repeat(matches2[0].length - 1);
                } else {
                  slashAdd = matches2[0];
                }
              }
              if (includeChangeList[matches2[1]]) {
                return slashAdd + includeChangeList[matches2[1]];
              } else {
                return slashAdd + matches2[2];
              }
            }
          };
        };
        result.data = result.data.replace(/(\\+)?@([ㄱ-힣a-zA-Z0-9_]+)=((?:\\@|[^@\n])+)@/g, handler());
        result.data = result.data.replace(/(\\+)?@([ㄱ-힣a-zA-Z0-9_]+)@/g, handler());
        result.data = result.data.replace(/^\n+/g, "");
        const mark = new _NamuMark(result.data, { ...this.config, docName: this.docName, docType: "include" }, this.database).parse();
        dataName = this.getToolDataStorage(
          "" + includeLink + '<div id="' + includeSubName + '" style="display: inline;">' + mark[0] + "</div>",
          "",
          matchOrg
        );
      } else {
        this.dataBacklink[includeName]["no"] = "";
        const includeLink = '<div><a class="opennamu_not_exist_link" style="color:#d1242f!important;text-decoration:underline" href="/w/' + urlPas(includeName) + '">(' + includeNameOrg + ")</a></div>";
        dataName = this.getToolDataStorage(includeLink, "", matchOrg);
      }
      this.renderData = this.renderData.replace(includeRegex, "<" + dataName + "></" + dataName + ">" + match[1]);
      includeCountMax -= 1;
    }
  }
  manageSlash() {
    const handler = (match, p1) => {
      if (p1 === "<") {
        return "<";
      } else {
        const dataName = this.getToolDataStorage(p1, void 0, void 0, "slash");
        return `<${dataName}>`;
      }
    };
    this.renderData = this.renderData.replace(/\\(&lt;|&gt;|&#x27;|&quot;|&amp;|.)/g, handler);
  }
  // re.sub fix
  manageMiddle() {
    let wikiCount = 0;
    let htmlCount = 0;
    let syntaxCount = 0;
    let foldingCount = 0;
    let interCount = 0;
    let interData = {};
    const middleRegex = /{{{([^{](?:(?!{{{|}}}).|\n)*)?(?:}|<(\/?(?:slash)_(?:[0-9]+)(?:[^<>]+))>)}}/;
    let middleCountAll = (this.renderData.match(globalRegExp(middleRegex)) || []).length * 10;
    while (true) {
      const middleDataMatch = this.renderData.match(middleRegex);
      if (middleCountAll < 0) break;
      else if (!middleDataMatch) break;
      let middleDataOrg = middleDataMatch[0];
      const middleSlash = middleDataMatch[2];
      if (middleSlash) {
        if (this.dataTempStorage[middleSlash] !== "}") {
          middleDataOrg = middleDataOrg.replace(/<(\/?(?:slash)_(?:[0-9]+)(?:[^<>]+))>/g, "<temp_" + middleSlash + ">");
          this.renderData = this.renderData.replace(middleRegex, middleDataOrg);
          continue;
        }
      }
      let middleData = middleDataMatch[1] || "";
      const middleNameMatch = middleData.match(/^([^ \n]+)/);
      let middleDataPass = "";
      let middleDataAdd = "";
      let dataName = "";
      if (!middleNameMatch) {
        if (middleSlash) {
          middleData += "\\";
        }
        const dataRevert = this.getToolDataRevert(middleData).replace(/^\n/g, "").replace(/\n$/g, "");
        dataName = this.getToolDataStorage(dataRevert, "", middleDataOrg);
        this.renderData = this.renderData.replace(middleRegex, "<" + dataName + ">" + middleDataPass + "</" + dataName + ">" + middleDataAdd);
        middleCountAll -= 1;
        continue;
      }
      const middleName = middleNameMatch[1].toLowerCase();
      if (middleName === "#!wiki") {
        if (middleSlash) {
          middleDataOrg = middleDataOrg.replace(/<(\/?(?:slash)_(?:[0-9]+)(?:[^<>]+))>/g, "<temp_" + middleSlash + ">");
          this.renderData = this.renderData.replace(middleRegex, middleDataOrg);
          continue;
        }
        let wikiData = middleData.replace(/^#!wiki +/g, "");
        const wikiRegex = /^(?:(?:style=(&quot;(?:(?:(?!&quot;).)*)&quot;|&#x27;(?:(?:(?!&#x27;).)*)&#x27;)))(?:\n| +)/i;
        const wikiDarkRegex = /^(?:(?:dark-style=(&quot;(?:(?:(?!&quot;).)*)&quot;|&#x27;(?:(?:(?!&#x27;).)*)&#x27;)))(?:\n| +)/i;
        let wikiDataStyleData = "";
        while (true) {
          let darkOnly = 0;
          let wikiDataStyleMatch = wikiData.match(wikiRegex);
          let wikiDataStyle;
          if (wikiDataStyleMatch) {
            wikiData = wikiData.replace(globalRegExp(wikiRegex), "");
          } else {
            wikiDataStyleMatch = wikiData.match(wikiDarkRegex);
            if (wikiDataStyleMatch) {
              darkOnly = 1;
              wikiData = wikiData.replace(globalRegExp(wikiDarkRegex), "");
            } else {
              break;
            }
          }
          if (wikiDataStyleMatch) {
            wikiDataStyle = wikiDataStyleMatch[1];
            if (wikiDataStyle) {
              wikiDataStyle = wikiDataStyle.replaceAll("&#x27;", "");
              wikiDataStyle = wikiDataStyle.replaceAll("&quot;", "");
              if (darkOnly == 1 && this.darkmode == "1") wikiDataStyleData += wikiDataStyle;
              else if (darkOnly == 0) wikiDataStyleData += wikiDataStyle;
            } else {
              wikiDataStyle = "";
            }
          } else {
            wikiDataStyle = "";
          }
        }
        const findRegex = [
          / *box-shadow *: *(([^,;]*)(,|;|$)){10,}/,
          / *url\([^()]*\)/,
          / *linear-gradient\((([^(),]+)(,|\))){10,}/,
          / *position *: */
        ];
        for (const regex of findRegex) {
          if (wikiDataStyleData.match(new RegExp(regex, "i"))) {
            wikiDataStyleData = "";
            break;
          }
        }
        wikiData = this.getToolDataRevert(wikiData).replace(/(^\n|\n$)/g, "");
        interData["inter_data_" + interCount] = wikiData;
        middleDataPass = "<inter_data_" + interCount + ">";
        interCount += 1;
        dataName = this.getToolDataStorage('<div style="' + wikiDataStyleData + '">', "</div>", middleDataOrg);
        wikiCount += 1;
      } else if (middleName === "#!style") {
        const styleData = this.getToolDataRevert(middleData.replace(/^#!style(?:[ \t]*\n)/i, "")).replace(/^\n|\n$/g, "");
        dataName = this.getToolDataStorage("<style>" + styleData, "</style>", middleDataOrg);
      } else if (middleName === "#!latex") {
        const latexData = this.getToolDataRevert(middleData.replace(/^#!latex(?:[ \t]*\n)/i, "")).replace(/^\n|\n$/g, "");
        dataName = this.getToolDataStorage('<div class="namu-latex-block">' + escapeHtml(latexData), "</div>", middleDataOrg);
      } else if (middleName === "#!if") {
        const ifMatch = middleData.match(/^#!if[ \t]+([^\n]+)\n/i);
        const expression = ifMatch ? this.getToolDataRevert(ifMatch[1]).trim() : "";
        const body = this.getToolDataRevert(middleData.replace(/^#!if[^\n]*\n/i, "")).replace(/^\n|\n$/g, "");
        if (evaluateSafeNamuIf(expression, this.docName)) {
          const interName = "inter_data_" + interCount;
          interData[interName] = body;
          middleDataPass = "<" + interName + ">";
          interCount += 1;
        }
        dataName = this.getToolDataStorage("", "", middleDataOrg);
      } else if (middleName === "#!html") {
        let htmlData = middleData.replace(/^#!html( |\n)/g, "");
        if (middleSlash) {
          htmlData += "\\";
        }
        const dataRevert = this.getToolDataRevert(htmlData).replace(/^\n/g, "").replace(/\n$/g, "").replaceAll("&amp;nbsp;", "&nbsp;");
        this.renderDataJS += 'opennamu_do_render_html("' + this.docSet["docInclude"] + "opennamu_wiki_" + htmlCount + '");\n';
        dataName = this.getToolDataStorage(
          '<span id="' + this.docSet["docInclude"] + "opennamu_wiki_" + htmlCount + '">' + dataRevert,
          "</span>",
          middleDataOrg
        );
        htmlCount += 1;
      } else if (middleName === "#!folding") {
        if (middleSlash) {
          middleDataOrg = middleDataOrg.replace(/<(\/?(?:slash)_(?:[0-9]+)(?:[^<>]+))>/g, "<temp_" + middleSlash + ">");
          this.renderData = this.renderData.replace(middleRegex, middleDataOrg);
          continue;
        }
        const wikiRegex = /^#!folding(?: ([^\n]*))?\n/i;
        let wikiDataFoldingMatch = middleData.match(wikiRegex);
        let wikiDataFolding;
        let wikiData = middleData.replace(globalRegExp(wikiRegex), "");
        if (wikiDataFoldingMatch) {
          wikiDataFolding = wikiDataFoldingMatch[1];
          if (!wikiDataFolding) {
            wikiDataFolding = "test";
          }
        } else {
          wikiDataFolding = "test";
        }
        wikiData = this.getToolDataRevert(wikiData).replace(/(^\n|\n$)/g, "");
        interData["inter_data_" + interCount] = wikiData;
        let wikiDataEnd = "<inter_data_" + interCount + ">";
        interCount += 1;
        middleDataPass = wikiDataFolding;
        dataName = this.getToolDataStorage('<details class="wiki-fold"><summary>', '</summary><div class="wiki-fold-content opennamu_folding">', middleDataOrg);
        const dataName2 = this.getToolDataStorage("", "</div></details>", "");
        middleDataAdd = "<" + dataName2 + ">" + wikiDataEnd + "</" + dataName2 + ">";
        foldingCount += 1;
      } else if (middleName === "#!syntax") {
        if (middleSlash) {
          middleDataOrg = middleDataOrg.replace(/<(\/?(?:slash)_(?:[0-9]+)(?:[^<>]+))>/g, "<temp_" + middleSlash + ">");
          this.renderData = this.renderData.replace(middleRegex, middleDataOrg);
          continue;
        }
        const wikiRegex = /^#!syntax(?: ([^\n]*))?\n/i;
        const wikiDataSyntaxMatch = middleData.match(wikiRegex);
        let wikiDataSyntax;
        let wikiData = middleData.replace(wikiRegex, "");
        if (wikiDataSyntaxMatch) {
          wikiDataSyntax = wikiDataSyntaxMatch[1];
          if (!wikiDataSyntax) {
            wikiDataSyntax = "python";
          } else if (wikiDataSyntax === "asm" || wikiDataSyntax === "assembly") {
            wikiDataSyntax = "x86arm";
          }
        } else {
          wikiDataSyntax = "python";
        }
        if (syntaxCount === 0) {
          this.renderDataJS += `hljs.highlightAll(); hljs.initLineNumbersOnLoad();
`;
        }
        dataName = this.getToolDataStorage('<pre id="syntax"><code class="' + wikiDataSyntax + '">' + wikiData, "</code></pre>", middleDataOrg);
        syntaxCount += 1;
      } else if (["+5", "+4", "+3", "+2", "+1", "-5", "-4", "-3", "-2", "-1"].includes(middleName)) {
        if (middleSlash) {
          middleDataOrg = middleDataOrg.replace(/<(\/?(?:slash)_(?:[0-9]+)(?:[^<>]+))>/g, "<temp_" + middleSlash + ">");
          this.renderData = this.renderData.replace(middleRegex, middleDataOrg);
          continue;
        }
        let wikiData = middleData.replace(/^(\+|\-)[1-5]( |\n)/g, "");
        let wikiSize;
        if (middleName == "+5") wikiSize = "200";
        else if (middleName == "+4") wikiSize = "180";
        else if (middleName == "+3") wikiSize = "160";
        else if (middleName == "+2") wikiSize = "140";
        else if (middleName == "+1") wikiSize = "120";
        else if (middleName == "-5") wikiSize = "50";
        else if (middleName == "-4") wikiSize = "60";
        else if (middleName == "-3") wikiSize = "70";
        else if (middleName == "-2") wikiSize = "80";
        else wikiSize = "90";
        middleDataPass = wikiData;
        dataName = this.getToolDataStorage('<span style="font-size:' + wikiSize + '%">', "</span>", middleDataOrg);
      } else if (middleName.match(/^@(?:((?:[0-9a-f-A-F]{3}){1,2})|(\w+))/)) {
        if (middleSlash) {
          middleDataOrg = middleDataOrg.replace(/<(\/?(?:slash)_(?:[0-9]+)(?:[^<>]+))>/g, "<temp_" + middleSlash + ">");
          this.renderData = this.renderData.replace(middleRegex, middleDataOrg);
          continue;
        }
        const wikiColorMatch = middleName.match(/^@(?:((?:[0-9a-f-A-F]{3}){1,2})|(\w+))(,@(?:((?:[0-9a-f-A-F]{3}){1,2})|(\w+)))?/);
        let wikiColorData = "";
        if (wikiColorMatch) {
          if (wikiColorMatch[1]) {
            wikiColorData += "#" + wikiColorMatch[1];
          } else {
            wikiColorData += wikiColorMatch[2];
          }
          if (wikiColorMatch[3]) {
            if (wikiColorMatch[4]) {
              wikiColorData += ",#" + wikiColorMatch[4];
            } else if (wikiColorMatch[5]) {
              wikiColorData += "," + wikiColorMatch[5];
            }
          }
        } else {
          wikiColorData += "red";
        }
        let wikiColor = this.getToolCssSafe(wikiColorData);
        wikiColor = this.getToolDarkModeSplit(wikiColor);
        const wikiData = middleData.replace(/^@(?:((?:[0-9a-f-A-F]{3}){1,2})|(\w+))(?:,@(?:((?:[0-9a-f-A-F]{3}){1,2})|(\w+)))?( |\n)/g, "");
        middleDataPass = wikiData;
        dataName = this.getToolDataStorage('<span style="background-color:' + wikiColor + '">', "</span>", middleDataOrg);
      } else if (middleName.match(/^#(?:((?:[0-9a-f-A-F]{3}){1,2})|(\w+))/)) {
        if (middleSlash) {
          middleDataOrg = middleDataOrg.replace(/<(\/?(?:slash)_(?:[0-9]+)(?:[^<>]+))>/g, "<temp_" + middleSlash + ">");
          this.renderData = this.renderData.replace(middleRegex, middleDataOrg);
          continue;
        }
        const wikiColorMatch = middleName.match(/^#(?:((?:[0-9a-f-A-F]{3}){1,2})|(\w+))(,#(?:((?:[0-9a-f-A-F]{3}){1,2})|(\w+)))?/);
        let wikiColorData = "";
        if (wikiColorMatch) {
          if (wikiColorMatch[1]) {
            wikiColorData += "#" + wikiColorMatch[1];
          } else {
            wikiColorData += wikiColorMatch[2];
          }
          if (wikiColorMatch[3]) {
            if (wikiColorMatch[4]) {
              wikiColorData += ",#" + wikiColorMatch[4];
            } else if (wikiColorMatch[5]) {
              wikiColorData += "," + wikiColorMatch[5];
            }
          }
        } else {
          wikiColorData += "red";
        }
        let wikiColor = this.getToolCssSafe(wikiColorData);
        wikiColor = this.getToolDarkModeSplit(wikiColor);
        const wikiData = middleData.replace(/^#(?:((?:[0-9a-f-A-F]{3}){1,2})|(\w+))(?:,#(?:((?:[0-9a-f-A-F]{3}){1,2})|(\w+)))?( |\n)/g, "");
        middleDataPass = wikiData;
        dataName = this.getToolDataStorage('<span style="color:' + wikiColor + '">', "</span>", middleDataOrg);
      } else {
        if (middleSlash) {
          middleData += "\\";
        }
        const dataRevert = this.getToolDataRevert(middleData).replace(/^\n/g, "").replace(/\n$/g, "");
        dataName = this.getToolDataStorage(dataRevert, "", middleDataOrg);
      }
      this.renderData = this.renderData.replace(middleRegex, "<" + dataName + ">" + middleDataPass + "</" + dataName + ">" + middleDataAdd);
      middleCountAll -= 1;
    }
    const interDataRegex = /<(inter_data_[0-9]+)>/g;
    const replaceInterData = () => {
      const replaceSub = (match, ...groups) => {
        let data = interData[groups[0]];
        data = data.replace(interDataRegex, replaceSub);
        return data;
      };
      return (match, ...groups) => {
        let data = interData[groups[0]];
        data = data.replace(interDataRegex, replaceSub);
        data = this.doInterRender(data, this.docSet["docInclude"] + "opennamu_inter_render_" + interCount);
        interCount += 1;
        return data;
      };
    };
    this.renderData = this.renderData.replace(interDataRegex, replaceInterData()).replace(/'<temp_(?<in>(?:slash)_(?:[0-9]+)(?:[^<>]+))>/g, "<$<in>>");
  }
  // re.sub fix
  manageMath() {
    const handler = (match, p1) => {
      let data = p1;
      data = this.getToolDataRevert(data.replace(/\n/g, ""));
      let dataHTML = this.getToolJSSafe(data);
      data = unescapeHtml(data);
      data = this.getToolJSSafe(data);
      let nameOb = this.docSet["docInclude"] + "opennamu_math_" + this.dataMathCount;
      let dataName = this.getToolDataStorage('<span id="' + nameOb + '">' + dataHTML, "</span>", match);
      this.renderDataJS += `
try {
  katex.render("${data}", document.getElementById("${nameOb}"));
} catch {
  if (document.getElementById("${nameOb}")) {
      document.getElementById("${nameOb}").innerHTML = "<span style='color: red;'>${dataHTML}</span>";
  }
}
      `;
      this.dataMathCount += 1;
      return `<${dataName}></${dataName}>`;
    };
    const mathRegex = /\[math\(((?:(?!\[math\(|\)\]).|\n)+)\)\]/gi;
    const mathRegex2 = /&lt;math&gt;((?:(?!&lt;math&gt;|&lt;\/math&gt;).)+)&lt;\/math&gt;/gi;
    this.renderData = this.renderData.replace(mathRegex2, handler);
    this.renderData = this.renderData.replace(mathRegex, handler);
  }
  // Bracket-table syntax used by compact information boxes:
  // [table(align=right,width=400)][tr][th=2]Title[/th][/tr]...[/table]
  // Compact table syntax for structured information boxes.
  manageBracketTables() {
    const blockRegex = /\[table(?:\(([^)\n]*)\))?\]([\s\S]*?)\[\/table\]/gi;
    let blockIndex = 0;
    this.renderData = this.renderData.replace(blockRegex, (whole, rawOptions, rawBody) => {
      const options = {};
      for (const option of splitSafeExpression(String(rawOptions || ""), ",")) {
        const equal = option.indexOf("=");
        if (equal < 1) continue;
        const key = option.slice(0, equal).trim().toLowerCase();
        const value = option.slice(equal + 1).trim().replace(/^(?:"|')|(?:"|')$/g, "");
        if (key) options[key] = value;
      }
      const rows = [];
      let row = [];
      let cell = null;
      const closeCell = () => {
        if (cell) {
          row.push(cell);
          cell = null;
        }
      };
      const closeRow = () => {
        closeCell();
        if (row.length) rows.push(row);
        row = [];
      };
      const appendText = (value) => {
        if (!value) return;
        if (!cell) {
          if (!value.trim()) return;
          cell = { tag: "td", colspan: 1, content: "" };
        }
        cell.content += value;
      };
      const tokenRegex = /\[(\/)?(tr|th|td)(?:\s*=\s*(\d+))?\]/gi;
      let cursor = 0;
      let token;
      while ((token = tokenRegex.exec(rawBody)) !== null) {
        appendText(rawBody.slice(cursor, token.index));
        cursor = tokenRegex.lastIndex;
        const closing = Boolean(token[1]);
        const tag = token[2].toLowerCase();
        if (tag === "tr") {
          closeRow();
          continue;
        }
        if (closing) {
          if (cell && cell.tag === tag) closeCell();
          continue;
        }
        closeCell();
        cell = {
          tag,
          colspan: Math.max(1, Math.min(50, Number(token[3]) || 1)),
          content: ""
        };
      }
      appendText(rawBody.slice(cursor));
      closeRow();
      if (!rows.length) return whole;
      const safeColor = (value) => /^(?:#[0-9a-f]{3,8}|[a-z]{1,24}|(?:rgba?|hsla?)\([\d.%+\/\- ,]+\))$/i.test(value);
      const wrapperStyles = [];
      const tableStyles = ["border-collapse:collapse", "max-width:100%"];
      const align = String(options.align || options.tablealign || "").toLowerCase();
      if (align === "right") wrapperStyles.push("float:right", "margin:0 0 12px 16px");
      else if (align === "left") wrapperStyles.push("float:left", "margin:0 16px 12px 0");
      else if (align === "center") wrapperStyles.push("display:table", "margin-left:auto", "margin-right:auto");
      const width = String(options.width || options.tablewidth || "").trim();
      if (/^\d+(?:\.\d+)?$/.test(width)) wrapperStyles.push("width:" + width + "px", "max-width:100%");
      else if (/^\d+(?:\.\d+)?(?:px|%|em|rem|vw)$/.test(width)) wrapperStyles.push("width:" + width, "max-width:100%");
      const background = options.bgcolor || options.tablebgcolor;
      if (background && safeColor(background)) tableStyles.push("background-color:" + background);
      const borderColor = options.bordercolor || options.tablebordercolor;
      if (borderColor && safeColor(borderColor)) tableStyles.push("border-color:" + borderColor);
      const textAlign = String(options.textalign || options.tabletextalign || "").toLowerCase();
      if (["left", "center", "right", "justify"].includes(textAlign)) tableStyles.push("text-align:" + textAlign);
      const className = String(options.class || options.tableclass || "").split(/\s+/).filter((value) => /^[a-zA-Z_][a-zA-Z0-9_-]{0,48}$/.test(value)).join(" ");
      let tableHtml = '<div class="table_safe bracket-table-wrap" style="' + wrapperStyles.join(";") + '">';
      tableHtml += '<table class="wiki-bracket-table' + (className ? " " + escapeHtml(className) : "") + '" style="' + tableStyles.join(";") + '"><tbody>';
      let cellIndex = 0;
      for (const cells of rows) {
        tableHtml += "<tr>";
        for (const item of cells) {
          const rendered = this.doInterRender(
            item.content,
            this.docSet["docInclude"] + "bracket_table_" + blockIndex + "_cell_" + cellIndex
          );
          const span = item.colspan > 1 ? ' colspan="' + item.colspan + '"' : "";
          tableHtml += "<" + item.tag + span + ">" + rendered + "</" + item.tag + ">";
          cellIndex += 1;
        }
        tableHtml += "</tr>";
      }
      tableHtml += "</tbody></table></div>";
      const storageName = this.getToolDataStorage(tableHtml, "", whole);
      blockIndex += 1;
      return "<" + storageName + "></" + storageName + ">";
    });
  }
  // re.sub fix
  manageTable() {
    this.renderData = this.renderData.replace(/\n +\|\|/g, "\n||");
    const manageTableParameter = (cellCount, parameter, data) => {
      const tableParameterAll = { div: "", class: "", table: "", tableBg: "", tr: "", td: "", col: "", colspan: "", rowspan: "", data: "" };
      let tableAlignAuto = 1;
      let tableColspanAuto = 1;
      let doAnyThing = "";
      const tableParameterRegex = /&lt;((?:(?!&lt;|&gt;).)+)&gt;/;
      const tableParameterRegexGlobal = /&lt;((?:(?!&lt;|&gt;).)+)&gt;/g;
      let match;
      let tableParameterResults = [];
      while ((match = tableParameterRegexGlobal.exec(parameter)) !== null) {
        tableParameterResults.push(match);
      }
      tableParameterResults.forEach((array) => array.splice(0, 1));
      tableParameterResults = tableParameterResults.flat();
      for (const tableParameter of tableParameterResults) {
        const tableParameterEqualIndex = tableParameter.indexOf("=");
        let tableParameterData;
        if (tableParameterEqualIndex >= 0) {
          const tableParameterName = tableParameter.slice(0, tableParameterEqualIndex).replace(/\s+/g, "").toLowerCase();
          tableParameterData = this.getToolCssSafe(tableParameter.slice(tableParameterEqualIndex + 1).trim());
          if (tableParameterName == "tablebgcolor") {
            const tableBgStyle = this.getToolThemeColorStyle("background", "bg", tableParameterData);
            tableParameterAll["table"] += tableBgStyle;
            tableParameterAll["tableBg"] += tableBgStyle;
          } else if (tableParameterName == "tablewidth") {
            tableParameterAll["div"] += "width:" + this.getToolPxAddCheck(tableParameterData) + ";max-width:100%;box-sizing:border-box;";
            tableParameterAll["table"] += "width:100%;";
          } else if (tableParameterName == "tableheight") tableParameterAll["table"] += "height:" + this.getToolPxAddCheck(tableParameterData) + ";";
          else if (tableParameterName == "rowheight") tableParameterAll["tr"] += "height:" + this.getToolPxAddCheck(tableParameterData) + ";";
          else if (tableParameterName == "tablealign") {
            if (tableParameterData == "right") tableParameterAll["div"] += "float:right;max-width:100%;";
            else if (tableParameterData == "center") {
              tableParameterAll["div"] += "display:table;max-width:100%;margin-left:auto;margin-right:auto;";
              tableParameterAll["table"] += "margin-left:auto;margin-right:auto;";
            }
          } else if (tableParameterName == "tableclass") tableParameterAll["class"] = tableParameterData.replace(/[^a-zA-Z0-9 _-]/g, "");
          else if (tableParameterName == "tabletextalign") tableParameterAll["table"] += "text-align:" + tableParameterData + " !important;";
          else if (tableParameterName == "tablecolor") tableParameterAll["table"] += this.getToolThemeColorStyle("color", "fg", tableParameterData);
          else if (tableParameterName == "tablebordercolor")
            tableParameterAll["table"] += this.getToolThemeColorStyle("border", "border", tableParameterData);
          else if (tableParameterName == "rowbgcolor") tableParameterAll["tr"] += this.getToolThemeColorStyle("background", "bg", tableParameterData);
          else if (tableParameterName == "rowtextalign") tableParameterAll["tr"] += "text-align:" + tableParameterData + " !important;";
          else if (tableParameterName == "rowcolor") tableParameterAll["tr"] += this.getToolThemeColorStyle("color", "fg", tableParameterData);
          else if (tableParameterName == "colcolor") tableParameterAll["col"] += this.getToolThemeColorStyle("color", "fg", tableParameterData);
          else if (tableParameterName == "colbgcolor")
            tableParameterAll["col"] += this.getToolThemeColorStyle("background", "bg", tableParameterData);
          else if (tableParameterName == "coltextalign") tableParameterAll["col"] += "text-align:" + tableParameterData + " !important;";
          else if (tableParameterName == "bgcolor") tableParameterAll["td"] += this.getToolThemeColorStyle("background", "bg", tableParameterData);
          else if (tableParameterName == "color") tableParameterAll["td"] += this.getToolThemeColorStyle("color", "fg", tableParameterData);
          else if (tableParameterName == "width") tableParameterAll["td"] += "width:" + this.getToolPxAddCheck(tableParameterData) + ";";
          else if (tableParameterName == "height") {
            const heightStyle = "height:" + this.getToolPxAddCheck(tableParameterData) + ";";
            if (data.trim() === "") tableParameterAll["tr"] += heightStyle;
            else tableParameterAll["td"] += heightStyle;
          } else doAnyThing += "&lt;" + tableParameter + "&gt;";
        } else {
          if (tableParameter.trim() == "nopad") tableParameterAll["td"] += "padding: 0 !important;";
          else if (tableParameter.match(/^-[0-9]+$/)) {
            tableColspanAuto = 0;
            tableParameterAll["colspan"] = tableParameter.replace(/[^0-9]+/g, "");
          } else if (tableParameter.match(/^(\^|v)?\|[0-9]+$/)) {
            if (tableParameter[0] == "^") tableParameterAll["td"] += "vertical-align: top;";
            else if (tableParameter[0] == "v") tableParameterAll["td"] += "vertical-align: bottom;";
            tableParameterAll["rowspan"] = tableParameter.replace(/[^0-9]+/g, "");
          } else if (["(", ":", ")"].includes(tableParameter)) {
            tableAlignAuto = 0;
            if (tableParameter == "(") tableParameterAll["td"] += "text-align: left !important;";
            else if (tableParameter == ":") tableParameterAll["td"] += "text-align: center !important;";
            else if (tableParameter == ")") tableParameterAll["td"] += "text-align: right !important;";
          } else if (tableParameter.match(/^(?:(?:#((?:[0-9a-f-A-F]{3}){1,2}))|(\w+))$/)) {
            tableParameterData = this.getToolCssSafe(tableParameter);
            tableParameterAll["td"] += this.getToolThemeColorStyle("background", "bg", tableParameterData);
          } else {
            doAnyThing += "&lt;" + tableParameter + "&gt;";
          }
        }
      }
      if (tableAlignAuto === 1) {
        if (data.match(/^ /)) {
          data = data.replace(/^ /g, "");
          if (data.match(/ $/)) {
            tableParameterAll["td"] += "text-align: center;";
            data = data.replace(/ $/g, "");
          } else {
            tableParameterAll["td"] += "text-align: right;";
          }
        } else {
          tableParameterAll["td"] += "text-align: left;";
          if (data.match(/ $/)) {
            data = data.replace(/ $/, "");
          }
        }
      }
      if (tableColspanAuto === 1) {
        tableParameterAll["colspan"] = "" + Math.floor(cellCount.length / 2);
      }
      tableParameterAll["data"] = doAnyThing + data;
      return tableParameterAll;
    };
    const tableRegex = /\n((?:(?:(?:(?:\|\|)+)|(?:\|[^|]+\|(?:\|\|)*))\n?(?:(?:(?!\|\|).)+))(?:(?:\|\||\|\|\n|(?:\|\|)+(?!\n)(?:(?:(?!\|\|).)+)\n*)*)\|\|)\n/s;
    const tableSubRegex = /(\n?)((?:\|\|)+)((?:&lt;(?:(?:(?!&lt;|&gt;).)+)&gt;)*)((?:\n*(?:(?:(?:(?!\|\|).)+)\n*)+)|(?:(?:(?!\|\|).)*))/;
    const tableCaptionRegex = /^\|([^|]+)\|/;
    let tableCountAll = (this.renderData.match(globalRegExp(tableRegex)) || []).length * 2;
    while (true) {
      const tableDataMatch = this.renderData.match(tableRegex);
      if (tableCountAll < 0) {
        console.error("error: render table count overflow");
        break;
      } else if (!tableDataMatch) break;
      let tableData = tableDataMatch[1];
      const tableCaptionMatch = tableData.match(tableCaptionRegex);
      let tableCaption;
      if (tableCaptionMatch) {
        tableCaption = `<caption>${tableCaptionMatch[1]}</caption>`;
        tableData = tableData.replace(globalRegExp(tableCaptionRegex), "||");
      } else {
        tableCaption = "";
      }
      const tableParameter = { div: "", class: "", table: "", tableBg: "", tr: "", td: "", col: {}, rowspan: {} };
      const getTableRowStyle = () => {
        const rowStyle = tableParameter["tr"];
        return /(?:^|;)\s*background(?:-color)?\s*:/i.test(rowStyle) ? rowStyle : tableParameter["tableBg"] + rowStyle;
      };
      let tableDataEnd = "";
      const appendTableRow = () => {
        const rowStyle = getTableRowStyle();
        const rowSpecificStyle = tableParameter["tr"];
        const rowContent = tableParameter["td"];
        if (rowContent) {
          tableDataEnd += '<tr style="' + rowStyle + '">' + rowContent + "</tr>";
          return;
        }
        if (!/(?:^|;)\s*(?:height|background(?:-color)?)\s*:/i.test(rowSpecificStyle)) return;
        const heightMatch = rowSpecificStyle.match(/(?:^|;)\s*height\s*:\s*([^;]+)/i);
        const cellStyle = heightMatch ? "height:" + heightMatch[1].trim() + ";" : "height:1px;";
        tableDataEnd += '<tr class="aonwiki-table-spacer" style="' + rowStyle + '"><td aria-hidden="true" style="' + cellStyle + '"></td></tr>';
      };
      let tableColNum = 0;
      let tableTrChange = 0;
      let match;
      let tableSubResults = [];
      const tableSubRegexGlobal = globalRegExp(tableSubRegex);
      while ((match = tableSubRegexGlobal.exec(tableData)) !== null) {
        tableSubResults.push(match);
      }
      tableSubResults.forEach((array) => array.splice(0, 1));
      for (const tableSub of tableSubResults) {
        let tableDataIn = tableSub[3];
        tableDataIn = tableDataIn.replace(/^\n+/g, "");
        if (tableSub[0] !== "" && tableTrChange === 1) {
          tableColNum = 0;
          appendTableRow();
          tableParameter["tr"] = "";
          tableParameter["td"] = "";
        }
        let tableSubParameter = manageTableParameter(tableSub[1], tableSub[2], tableDataIn);
        tableParameter["tr"] += tableSubParameter["tr"];
        while (Number(tableParameter["rowspan"][tableColNum] || 0) > 0) {
          tableParameter["rowspan"][tableColNum] -= 1;
          tableColNum += 1;
        }
        const colspanInt = Math.max(1, Number(tableSubParameter["colspan"]) || 1);
        if (tableSubParameter["rowspan"] !== "") {
          const rowspanInt = Number(tableSubParameter["rowspan"]);
          if (rowspanInt > 1) {
            for (let spanColumn = 0; spanColumn < colspanInt; spanColumn += 1) {
              tableParameter["rowspan"][tableColNum + spanColumn] = rowspanInt - 1;
            }
          }
        }
        if (!tableParameter["col"][tableColNum]) {
          tableParameter["col"][tableColNum] = "";
        }
        tableParameter["div"] += tableSubParameter["div"];
        tableParameter["class"] = tableSubParameter["class"] !== "" ? tableSubParameter["class"] : tableParameter["class"];
        tableParameter["table"] += tableSubParameter["table"];
        tableParameter["tableBg"] = tableSubParameter["tableBg"] || tableParameter["tableBg"];
        tableParameter["col"][tableColNum] += tableSubParameter["col"];
        const isEmptyParameterRow = tableDataIn.trim() === "" && tableSub[2] !== "";
        if (tableSub[2] === "" && tableSub[3] === "" || isEmptyParameterRow) {
          tableTrChange = 1;
        } else {
          tableTrChange = 0;
          tableParameter["td"] += '<td colspan="' + tableSubParameter["colspan"] + '" rowspan="' + tableSubParameter["rowspan"] + '" style="' + tableParameter["col"][tableColNum] + tableSubParameter["td"] + '"><back_br>\n' + tableSubParameter["data"] + "\n<front_br></td>";
        }
        tableColNum += colspanInt;
      }
      appendTableRow();
      tableDataEnd = '<table class="' + tableParameter["class"] + '" style="' + tableParameter["table"] + '">' + tableCaption + tableDataEnd + "</table>";
      tableDataEnd = '<div class="table_safe" style="' + tableParameter["div"] + '">' + tableDataEnd + "</div>";
      this.renderData = this.renderData.replace(tableRegex, "\n<front_br>" + tableDataEnd + "\n");
      tableCountAll -= 1;
    }
  }
  manageList() {
    const quoteRegex = /((?:\n&gt; *[^\n]*)+)\n/;
    let quoteCount = 0;
    let quoteCountMax = (this.renderData.match(globalRegExp(quoteRegex)) || []).length * 10;
    while (true) {
      let quoteDataMatch = this.renderData.match(quoteRegex);
      if (quoteCountMax < 0) break;
      else if (!quoteDataMatch) break;
      else {
        const quoteDataOrg = quoteDataMatch[0];
        let quoteData = quoteDataMatch[1];
        quoteData = quoteData.replace(/\n&gt; *(?<in>[^\n]*)/g, "$<in>\n").replace(/\n$/g, "");
        quoteData = this.getToolDataRevert(quoteData);
        let quoteDataEnd = this.doInterRender(quoteData, this.docSet["docInclude"] + "opennamu_quote_" + quoteCount);
        const dataName = this.getToolDataStorage("<div>", "</div>", quoteDataOrg);
        this.renderData = this.renderData.replace(
          quoteRegex,
          "\n<blockquote><back_br>\n<" + dataName + ">" + quoteDataEnd + "</" + dataName + "><front_br></blockquote>\n"
        );
      }
      quoteCountMax -= 1;
      quoteCount += 1;
    }
    function intToAlpha(num) {
      const alphaList = Array.from(Array(26), (_, i) => String.fromCharCode(97 + i)).join("");
      const alphaLen = alphaList.length;
      let end_text = "";
      while (num) {
        end_text = alphaList[num % alphaLen - 1] + end_text;
        num = Math.floor(num / alphaLen);
      }
      return end_text;
    }
    function intToRoman(number) {
      const num = [1, 4, 5, 9, 10, 40, 50, 90, 100, 400, 500, 900, 1e3];
      const sym = ["I", "IV", "V", "IX", "X", "XL", "L", "XC", "C", "CD", "D", "CM", "M"];
      let i = 12;
      let end_text = "";
      while (number) {
        let div = Math.floor(number / num[i]);
        number %= num[i];
        while (div) {
          end_text += sym[i];
          div -= 1;
        }
        i -= 1;
      }
      return end_text;
    }
    const useListViewChange = this.config.useListViewChange;
    const listStyle = {
      1: "opennamu_list_1",
      2: "opennamu_list_2",
      3: "opennamu_list_3",
      4: "opennamu_list_4"
    };
    const intToMatch = () => {
      const listNum = {};
      return (match, ...groups) => {
        if (groups[3]) {
          let listData = groups[4];
          const listLen = groups[0].length;
          const styleLevel = Math.max(1, listLen);
          let listStyleData = "opennamu_list_5";
          if (listStyle[styleLevel]) {
            listStyleData = listStyle[styleLevel];
          }
          return '<li class="' + listStyleData + '" data-list-level="' + listLen + '">' + listData + "</li>";
        } else {
          let listType = groups[1];
          let doType = "int";
          if (listType == "a") doType = "alpha_small";
          else if (listType == "A") doType = "alpha_big";
          else if (listType == "i") doType = "roman_small";
          else if (listType == "I") doType = "roman_big";
          if (!listNum[doType]) listNum[doType] = [];
          for (const type of Object.keys(listNum)) {
            if (type !== doType) listNum[type] = [];
          }
          let listData = groups[4];
          let listStart = groups[2];
          let listLen = groups[0].length;
          if (listLen === 0) {
            listLen = 1;
          }
          if (listNum[doType].length >= listLen) {
            listNum[doType][listLen - 1] += 1;
            for (let i = listLen; i < listNum[doType].length; i++) {
              listNum[doType][i] = 0;
            }
          } else {
            listNum[doType] = listNum[doType].concat(
              "1".repeat(listLen - listNum[doType].length).split("").map((v) => Number(v))
            );
          }
          if (listStart) {
            listNum[doType][listLen - 1] = Number(listStart);
          }
          let changeText;
          if (doType == "int") {
            if (useListViewChange === "on") {
              changeText = listNum[doType].filter((value) => value !== 0).map((value) => String(value)).join("-");
            } else {
              changeText = String(listNum[doType][listLen - 1]);
            }
          } else if (doType == "roman_big") changeText = intToRoman(listNum[doType][listLen - 1]).toUpperCase();
          else if (doType == "roman_small") changeText = intToRoman(listNum[doType][listLen - 1]).toLowerCase();
          else if (doType == "alpha_big") changeText = intToAlpha(listNum[doType][listLen - 1]).toUpperCase();
          else changeText = intToAlpha(listNum[doType][listLen - 1]).toLowerCase();
          return '<li style="margin-left: ' + (listLen - 1) * 20 + 'px;" class="opennamu_list_none">' + changeText + ". " + listData + "</li>";
        }
      };
    };
    const listRegex = /((?:\n( *)(?:(\*)) ?([^\n]*))+|(?:\n( *)(?:(1|a|A|I|i)\.(?:#([0-9]*))?) ?([^\n]*)){2,})\n/;
    let listCountMax = (this.renderData.match(globalRegExp(listRegex)) || []).length * 3;
    while (true) {
      const listDataMatch = this.renderData.match(listRegex);
      if (listCountMax < 0) break;
      else if (!listDataMatch) break;
      else {
        const listData = listDataMatch[1];
        const listSubRegex = /\n( *)(?:(1|a|A|I|i)\.(?:#([0-9]*))?|(\*)) ?([^\n]*)/g;
        const listDataStr = listData.replace(listSubRegex, intToMatch());
        const listEnd = (listDataMatch.index || 0) + listDataMatch[0].length;
        const isUnorderedList = /(?:^|\n)\s*\*/.test(listData);
        const followingSource = this.renderData.slice(listEnd).replace(/<front_br>|<back_br>/g, "").trim();
        const hasFollowingContent = followingSource.length > 0;
        const listEndDivider = isUnorderedList && hasFollowingContent ? '<hr class="wiki-list-end-divider" role="separator">' : "";
        const replacement = '\n<front_br><ul class="' + (isUnorderedList ? "wiki-unordered-list" : "wiki-numbered-list") + '">' + listDataStr + "</ul>" + listEndDivider + "<back_br>\n";
        this.renderData = this.renderData.slice(0, listDataMatch.index || 0) + replacement + this.renderData.slice(listEnd);
      }
      listCountMax -= 1;
    }
  }
  // re.sub fix
  manageMacro() {
    const manageMacroDouble = (full, ...match) => {
      const matchOriginal = full;
      const nameData = match[0].toLowerCase();
      const macroSplitRegex = /(?:^|,) *([^,]+)/;
      const macroSplitSubRegex = /(^[^=]+) *= *([^=]+)/;
      if (["youtube", "nicovideo", "navertv", "kakaotv", "vimeo", "instagram", "twitter", "tiktok", "facebook"].includes(nameData)) {
        const data = match[1].match(globalRegExp(macroSplitRegex)) || [];
        let videoCode = "";
        let videoStart = "";
        let videoEnd = "";
        let videoWidth = "640px";
        let videoHeight = "360px";
        if (nameData == "instagram" || nameData == "tiktok") {
          videoWidth = "360px";
          videoHeight = "480px";
        } else if (nameData == "facebook") {
          videoWidth = "500px";
          videoHeight = "616px";
        } else if (nameData == "twitter") {
          videoWidth = "480px";
          videoHeight = "480px";
        }
        for (const datum of data) {
          const dataSubMatch = datum.match(macroSplitSubRegex);
          if (dataSubMatch) {
            let dataSub = dataSubMatch.slice(1);
            dataSub = [dataSub[0].toLowerCase(), dataSub[1]];
            if (dataSub[0] === "width") videoWidth = this.getToolPxAddCheck(dataSub[1]);
            else if (dataSub[0] === "height") videoHeight = this.getToolPxAddCheck(dataSub[1]);
            else if (dataSub[0] === "start") videoStart = dataSub[1];
            else if (dataSub[0] === "end") videoEnd = dataSub[1];
            else if (dataSub[0] === "https://www.youtube.com/watch?v" && nameData == "youtube") videoCode = dataSub[1];
          } else {
            videoCode = datum;
          }
        }
        if (nameData === "youtube") {
          videoCode = videoCode.replace(/^https:\/\/youtu\.be\//g, "");
          videoCode = `https://www.youtube.com/embed/${videoCode}`;
          if (videoStart !== "") {
            if (videoEnd !== "") {
              videoCode += "?start=" + videoStart + "&end=" + videoEnd;
            } else {
              videoCode += "?start=" + videoStart;
            }
          } else {
            if (videoEnd !== "") {
              videoCode += "?end=" + videoEnd;
            }
          }
        } else if (nameData === "instagram") {
          videoCode = videoCode.replace(/^https:\/\/www\.instagram\.com\/p\//g, "");
          videoCode = "https://www.instagram.com/p/" + videoCode + "/embed/";
        } else if (nameData === "facebook") {
          videoCode = "https://www.facebook.com/plugins/post.php?href=" + videoCode + "&width=" + videoWidth + "&height=" + videoHeight;
        } else if (nameData === "tiktok") {
          videoCode = "https://www.tiktok.com/embed/v2/" + videoCode;
        } else if (nameData === "twitter") {
          videoCode = "https://twitframe.com/show?url=" + videoCode;
          if (this.darkmode === "1")
            videoCode += "&theme=dark";
        } else if (nameData === "kakaotv") {
          videoCode = videoCode.replace(/^https:\/\/tv\.kakao\.com\/v\//g, "");
          videoCode = `https://tv.kakao.com/embed/player/cliplink/${videoCode}?service=kakao_tv`;
        } else if (nameData === "navertv") {
          videoCode = videoCode.replace(/^https:\/\/tv\.naver\.com\/v\//g, "");
          videoCode = `https://tv.naver.com/embed/${videoCode}`;
        } else if (nameData === "nicovideo") {
          videoCode = `https://embed.nicovideo.jp/watch/${videoCode}`;
        } else {
          videoCode = `https://player.vimeo.com/video/${videoCode}`;
        }
        videoWidth = this.getToolCssSafe(videoWidth);
        videoHeight = this.getToolCssSafe(videoHeight);
        const dataName = this.getToolDataStorage(
          '<iframe style="width: ' + videoWidth + "; height: " + videoHeight + ';" src="' + videoCode + '" frameborder="0" allowfullscreen>',
          "</iframe>",
          matchOriginal
        );
        return "<" + dataName + "></" + dataName + ">";
      } else if (["\uBAA9\uCC28", "tableofcontents", "toc"].includes(nameData) && String(match[1] || "").trim().toLowerCase() === "hide") {
        return "<toc_need_part_hide>";
      } else if (nameData === "toc") {
        return "<toc_no_auto>";
      } else if (nameData === "ruby") {
        const data = match[1].match(globalRegExp(macroSplitRegex)) || [];
        let mainText = "";
        let subText = "";
        let color = "";
        for (const datum of data) {
          const dataSubMatch = datum.match(macroSplitSubRegex);
          if (dataSubMatch) {
            let dataSub = dataSubMatch.slice(1);
            dataSub = [dataSub[0].toLowerCase(), dataSub[1]];
            if (dataSub[0] === "ruby") subText = dataSub[1];
            else if (dataSub[0] === "color") color = dataSub[1];
          } else {
            mainText = datum;
          }
        }
        mainText = this.getToolDataRevert(mainText, "render");
        subText = this.getToolDataRevert(subText, "render");
        color = this.getToolCssSafe(color);
        if (color !== "") {
          subText = '<span style="color:' + color + ';">' + subText + "</span>";
        }
        const dataName = this.getToolDataStorage("<ruby>" + mainText + "<rp>(</rp><rt>" + subText + "</rt><rp>)</rp></ruby>", "", matchOriginal);
        return "<" + dataName + "></" + dataName + ">";
      } else if (nameData === "anchor") {
        const mainText = this.getToolDataRevert(match[1], "render");
        const dataName = this.getToolDataStorage('<span id="' + mainText + '">', "</span>", matchOriginal);
        return "<" + dataName + "></" + dataName + ">";
      } else if (nameData === "age") {
        let dataText = "";
        const datePattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
        if (datePattern.test(match[1])) {
          const date = new Date(match[1]);
          const dateNow = /* @__PURE__ */ new Date();
          if (!isNaN(date.getTime())) {
            if (date > dateNow) {
              dataText = "invalid date";
            } else {
              const diffInYears = Math.floor((dateNow.valueOf() - date.valueOf()) / (1e3 * 60 * 60 * 24 * 365));
              dataText = diffInYears.toString();
            }
          } else {
            dataText = "invalid date";
          }
        } else {
          dataText = "invalid date";
        }
        const dataName = this.getToolDataStorage(dataText, "", matchOriginal);
        return `<${dataName}></${dataName}>`;
      } else if (nameData === "dday") {
        let dataText = "";
        const datePattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
        if (datePattern.test(match[1])) {
          const date = new Date(match[1]);
          const dateNow = /* @__PURE__ */ new Date();
          if (!isNaN(date.getTime())) {
            const dateEnd = Math.floor((dateNow.valueOf() - date.valueOf()) / (1e3 * 60 * 60 * 24));
            if (dateEnd > 0) {
              dataText = "+" + dateEnd;
            } else if (dateEnd === 0) {
              dataText = "-" + dateEnd;
            } else {
              dataText = dateEnd.toString();
            }
          } else {
            dataText = "invalid date";
          }
        } else {
          dataText = "invalid date";
        }
        const dataName = this.getToolDataStorage(dataText, "", matchOriginal);
        return `<${dataName}></${dataName}>`;
      } else if (nameData === "pagecount") {
        return "0";
      } else {
        return "<macro>" + match[0] + "(" + match[1] + ")</macro>";
      }
    };
    this.renderData = this.renderData.replace(/\[([^[(\]]+)\(((?:(?!\)\]).)+)\)\]/g, manageMacroDouble);
    const manageMacroSingle = (full, p1) => {
      const matchOriginal = full;
      let match = p1.toLowerCase();
      if (["date", "datetime"].includes(match)) {
        const getTime = () => {
          const date = /* @__PURE__ */ new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          const seconds = String(date.getSeconds()).padStart(2, "0");
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };
        const dataName = this.getToolDataStorage(getTime(), "", matchOriginal);
        return "<" + dataName + "></" + dataName + ">";
      } else if (match === "br") {
        const dataName = this.getToolDataStorage("<br>", "", matchOriginal);
        return "<" + dataName + "></" + dataName + ">";
      } else if (match === "clearfix") {
        const dataName = this.getToolDataStorage('<div style="clear: both;"></div>', "", matchOriginal);
        return "<" + dataName + "></" + dataName + ">";
      } else if (["\uBAA9\uCC28", "toc", "tableofcontents"].includes(match)) {
        return "<toc_need_part>";
      } else if (match === "pagecount") {
        return String((this.database.data || []).length);
      } else {
        const externalMatch = p1.trim().match(/^(https?:\/\/[^\s|]+)(?:\|([\s\S]+)|\s+([\s\S]+))?$/i);
        if (externalMatch) {
          let sourceHref = externalMatch[1];
          let label = externalMatch[2] || externalMatch[3] || sourceHref;
          if (!externalMatch[2] && !externalMatch[3]) {
            const playEntry = sourceHref.match(/^(https?:\/\/playentry\.org\/project\/[a-f0-9]{24})([가-힣A-Za-z][가-힣A-Za-z0-9_-]*)$/i);
            if (playEntry) {
              sourceHref = playEntry[1];
              label = playEntry[2];
            }
          }
          let href = this.getToolDataRestore(sourceHref, "slash");
          href = unescapeHtml(href);
          if (/^https?:\/\//i.test(href)) {
            const safeHref = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeLabel = escapeHtml(label);
            const dataName = this.getToolDataStorage(
              '<a class="opennamu_link_out" target="_blank" rel="noopener noreferrer" href="' + safeHref + '">',
              "</a>",
              matchOriginal
            );
            return "<" + dataName + ">" + safeLabel + "</" + dataName + ">";
          }
        }
        return `<macro>${p1}</macro>`;
      }
    };
    this.renderData = this.renderData.replace(/\[([^[\]]+)\]/g, manageMacroSingle);
    this.renderData = this.renderData.replaceAll("<macro>", "[");
    this.renderData = this.renderData.replaceAll("</macro>", "]");
  }
  // re.sub fix
  manageLink() {
    this.renderData = this.renderData.replaceAll("[[]]", "");
    const linkRegex = /\[\[((?:(?!\[\[|\]\]|\||<|>).|<(?:\/?(?:slash)_(?:[0-9]+)(?:[^<>]+))>)+)(?:\|((?:(?!\[\[|\]\]|\|).)+))?\]\](\n?)/;
    let imageCount = 0;
    let linkCountAll = (this.renderData.match(globalRegExp(linkRegex)) || []).length * 4;
    while (true) {
      const linkDataMatch = this.renderData.match(linkRegex);
      if (!linkDataMatch) break;
      else if (linkCountAll < 0) {
        console.log("Error: render link count overflow");
        break;
      }
      const linkDataFull = linkDataMatch[0];
      let linkData = linkDataMatch.slice(1);
      let linkMain = linkData[0];
      let linkMainOrg = linkMain;
      if (linkMain.match(/^(파일|file|외부|out):/i)) {
        let fileWidth = "";
        let fileHeight = "";
        let fileAlign = "";
        let fileBgcolor = "";
        let fileTurn = "";
        let fileRadius = "";
        let fileRendering = "";
        const fileSplitRegex = /(?:^|&amp;) *((?:(?!&amp;).)+)/g;
        const fileSplitSubRegex = /(^[^=]+) *= *([^=]+)/;
        if (linkData[1]) {
          const data = linkData[1].match(fileSplitRegex) || [];
          for (const datum of data) {
            const dataSub = datum.match(fileSplitSubRegex);
            if (dataSub) {
              const key = dataSub[1].trim();
              const value = dataSub[2].trim();
              switch (key) {
                case "width":
                  fileWidth = this.getToolPxAddCheck(value);
                  break;
                case "height":
                  fileHeight = this.getToolPxAddCheck(value);
                  break;
                case "align":
                  if (["center", "left", "right"].includes(value)) {
                    fileAlign = value;
                  }
                  break;
                case "bgcolor":
                  fileBgcolor = value;
                  break;
                case "theme":
                  if (value === "dark") {
                    fileTurn = "dark";
                  } else if (value === "light") {
                    fileTurn = "light";
                  }
                  break;
                case "border-radius":
                  fileRadius = this.getToolPxAddCheck(value);
                  break;
                case "rendering":
                  if (value === "pixelated") {
                    fileRendering = "pixelated";
                  }
                  break;
                default:
                  break;
              }
            }
          }
        }
        linkMainOrg = "";
        let linkSub = linkMain;
        let fileOut = 0;
        let linkExist;
        let linkExtension;
        const linkOutRegex = /^(외부|out):/i;
        const linkInRegex = /^(파일|file):/i;
        if (linkOutRegex.test(linkMain)) {
          linkMain = linkMain.replace(new RegExp(linkOutRegex, "gi"), "");
          linkMain = this.getToolDataRestore(linkMain, "slash");
          linkMain = unescapeHtml(linkMain);
          linkMain = linkMain.replace(/"/g, "&quot;");
          linkExist = "";
          fileOut = 1;
        } else {
          linkMain = linkMain.replace(new RegExp(linkInRegex, "gi"), "");
          linkMain = this.getToolDataRestore(linkMain, "slash");
          linkMain = unescapeHtml(linkMain);
          if (!this.dataBacklink[`file:${linkMain}`]) {
            this.dataBacklink[`file:${linkMain}`] = {};
          }
          const dbData = this.getToolDatabaseFind(`file:${linkMain}`)?.title;
          if (dbData) {
            linkExist = "";
          } else {
            linkExist = "opennamu_not_exist_link";
            this.dataBacklink[`file:${linkMain}`]["no"] = "";
          }
          const rev = "1";
          this.dataBacklink[`file:${linkMain}`]["file"] = "";
          const linkExtensionRegex = /\.([^.]+)$/;
          const linkExtensionMatch = linkMain.match(linkExtensionRegex);
          if (linkExtensionMatch) {
            linkExtension = linkExtensionMatch[1];
          } else {
            linkExtension = "jpg";
          }
          linkMain = linkMain.replace(new RegExp(linkExtensionRegex, "g"), "");
          linkMainOrg = linkMain;
          linkMain = "/image/" + urlPas(sha224Replace(linkMain)) + "." + linkExtension + ".cache_v" + rev;
        }
        if (fileWidth !== "") {
          fileWidth = "width:" + this.getToolCssSafe(fileWidth) + ";";
        }
        if (fileHeight !== "") {
          fileHeight = "height:" + this.getToolCssSafe(fileHeight) + ";";
        }
        let fileAlignStyle = "";
        if (["left", "right"].includes(fileAlign)) {
          fileAlignStyle = "float:" + fileAlign + ";";
        }
        if (fileBgcolor !== "") {
          fileBgcolor = "background:" + this.getToolCssSafe(fileBgcolor) + ";";
        }
        if (fileRadius !== "") fileRadius = "border-radius:" + this.getToolCssSafe(fileRadius) + ";";
        if (fileRendering != "") fileRendering = "image-rendering:" + this.getToolCssSafe(fileRendering) + ";";
        const fileStyle = fileWidth + fileHeight + fileAlignStyle + fileBgcolor + fileRadius + fileRendering;
        let fileEnd;
        const useImageSet = this.config.useImageSet;
        if (useImageSet == "new_click" || useImageSet == "click") {
          fileEnd = '<img style="' + fileStyle + '" id="opennamu_image_' + imageCount + '" alt="' + linkSub + '" src="">';
        } else {
          fileEnd = '<img style="' + fileStyle + '" alt="' + linkSub + '" src="' + linkMain + '">';
        }
        if (fileAlign === "center") {
          fileEnd = `<div style="text-align:center;">${fileEnd}</div>`;
        }
        if (linkExist !== "") {
          const dataName = this.getToolDataStorage(
            `<a class="${linkExist}" title="${linkSub}" href="/upload?name=${urlPas(linkMainOrg)}">(${linkSub})</a>`,
            "</a>",
            linkDataFull
          );
          this.renderData = this.renderData.replace(linkRegex, `<${dataName}></${dataName}>`);
        } else {
          let filePass = 0;
          if (fileTurn !== "") {
            if (fileTurn === "dark" && this.darkmode === "1") {
              filePass = 1;
            } else if (fileTurn === "light" && this.darkmode === "0") {
              filePass = 1;
            }
          } else {
            filePass = 1;
          }
          let fileLink;
          let dataName;
          if (filePass === 1) {
            if (fileOut === 0) {
              fileLink = "/w/file:" + urlPas(linkMainOrg) + "." + urlPas(linkExtension);
            } else {
              fileLink = linkMain;
            }
            if (useImageSet === "new_click") {
              dataName = this.getToolDataStorage(
                '<a title="' + linkSub + '" id="opennamu_image_' + imageCount + '_link" href="javascript:void(0);">' + fileEnd,
                "</a>",
                linkDataFull
              );
              this.renderDataJS += 'document.getElementById("opennamu_image_' + imageCount + '_link").addEventListener("click", function(e) { document.getElementById("opennamu_image_' + imageCount + '").src = "' + this.getToolJSSafe(linkMain) + '";setTimeout(function() {document.getElementById("opennamu_image_' + imageCount + '_link").href = "' + this.getToolJSSafe(fileLink) + '";}, 100);});\n';
              imageCount += 1;
            } else {
              dataName = this.getToolDataStorage('<a title="' + linkSub + '" href="' + fileLink + '">' + fileEnd, "</a>", linkDataFull);
            }
          } else {
            dataName = this.getToolDataStorage("", "", linkDataFull);
          }
          this.renderData = this.renderData.replace(linkRegex, `<${dataName}></${dataName}>` + linkData[2]);
        }
      } else if (/^(분류|category):/i.test(linkMain)) {
        linkMain = linkMain.replace(/^(분류|category):/gi, "");
        let categoryBlur = "";
        if (/#blur$/i.test(linkMain)) {
          linkMain = linkMain.replace(/#blur$/gi, "");
          categoryBlur = "opennamu_category_blur";
        }
        let linkSub = linkMain;
        let linkView = "";
        if (linkData.length > 1 && linkData[1]) linkView = linkData[1];
        linkMain = this.getToolDataRestore(linkMain, "slash");
        linkMain = unescapeHtml(linkMain);
        if (!this.dataCategoryList.includes(linkMain)) {
          this.dataCategoryList.push(linkMain);
          if (!this.dataBacklink["category:" + linkMain]) this.dataBacklink["category:" + linkMain] = {};
          const dbData = this.getToolDatabaseFind("category:" + linkMain)?.title;
          let linkExist;
          if (dbData) {
            linkExist = "";
          } else {
            linkExist = "opennamu_not_exist_link";
            this.dataBacklink["category:" + linkMain]["no"] = "";
          }
          this.dataBacklink["category:" + linkMain]["cat"] = "";
          if (linkView != "") this.dataBacklink["category:" + linkMain]["cat_view"] = linkView;
          if (categoryBlur != "") this.dataBacklink["category:" + linkMain]["cat_blur"] = "";
          linkMain = urlPas(linkMain);
          if (this.dataCategory === "") {
            this.dataCategory = '<div class="opennamu_category" id="cate"><span class="opennamu_category_label">\uBD84\uB958:</span><span class="opennamu_category_links">';
          } else {
            this.dataCategory += " | ";
          }
          this.dataCategory += `<a class="${categoryBlur} ${linkExist}" title="${linkSub}" href="/w/category:${linkMain}">${linkSub}</a>`;
        }
        this.renderData = this.renderData.replace(linkRegex, "");
      } else if (/^(?:inter|인터):([^:]+):/i.test(linkMain)) {
        const prefixMatch = linkMain.match(/^(?:inter|인터):([^:]+):/i);
        const prefix = (prefixMatch?.[1] || "").toLowerCase();
        let target = linkMain.slice(prefixMatch?.[0].length || 0);
        let fragment = "";
        const hashIndex = target.lastIndexOf("#");
        if (hashIndex >= 0) {
          fragment = target.slice(hashIndex + 1);
          target = target.slice(0, hashIndex);
        }
        const interwikiBases = {
          wikipedia: "https://en.wikipedia.org/wiki/",
          enwiki: "https://en.wikipedia.org/wiki/",
          kowiki: "https://ko.wikipedia.org/wiki/",
          "ko.wikipedia": "https://ko.wikipedia.org/wiki/",
          wiktionary: "https://en.wiktionary.org/wiki/",
          commons: "https://commons.wikimedia.org/wiki/",
          wikisource: "https://en.wikisource.org/wiki/",
          wikibooks: "https://en.wikibooks.org/wiki/",
          wikiquote: "https://en.wikiquote.org/wiki/",
          wikinews: "https://en.wikinews.org/wiki/",
          wikiversity: "https://en.wikiversity.org/wiki/",
          metawiki: "https://meta.wikimedia.org/wiki/"
        };
        const base = interwikiBases[prefix];
        if (!base || !target.trim()) {
          this.renderData = this.renderData.replace(linkRegex, linkData[1] || linkDataFull);
        } else {
          const safeTarget = encodeURIComponent(target.trim().replace(/ /g, "_")).replace(/%2F/gi, "/");
          const safeFragment = fragment ? "#" + encodeURIComponent(fragment) : "";
          const href = base + safeTarget + safeFragment;
          const label = linkData[1] || prefix + ":" + target;
          const dataName = this.getToolDataStorage(
            '<a class="opennamu_link_out opennamu_interwiki_link" target="_blank" rel="noopener noreferrer" href="' + href + '">',
            "</a>",
            linkDataFull
          );
          this.renderData = this.renderData.replace(linkRegex, "<" + dataName + ">" + label + "</" + dataName + ">" + linkData[2]);
        }
      } else if (/^https?:\/\//i.test(linkMain)) {
        linkMain = this.getToolDataRestore(linkMain, "slash");
        const linkTitle = linkMain;
        linkMain = unescapeHtml(linkMain);
        linkMain = linkMain.replace(/"/g, "&quot;");
        linkMain = linkMain.replace(/</g, "&lt;");
        linkMain = linkMain.replace(/>/g, "&gt;");
        let linkSub = linkData[1] || "";
        const linkSubStorage = linkSub ? "" : linkMainOrg;
        const linkClass = "opennamu_link_out";
        const addStr = linkData[2] || "";
        const dataName = this.getToolDataStorage(
          `<a class="${linkClass}" target="_blank" title="${linkTitle}" href="${linkMain}">${linkSubStorage}`,
          "</a>",
          linkDataFull
        );
        this.renderData = this.renderData.replace(linkRegex, `<${dataName}>${linkSub}</${dataName}>` + addStr);
      } else {
        linkMain = this.getToolLinkFix(linkMain);
        linkMain = linkMain.replace(/&#x27;/g, "<link_single>");
        const linkDataSharpRegex = /#([^#]+)$/;
        let linkDataSharpMatch = linkMain.match(linkDataSharpRegex) || [];
        let linkDataSharp;
        if (linkDataSharpMatch.length !== 0) {
          linkDataSharp = linkDataSharpMatch[1];
          linkDataSharp = unescapeHtml(linkDataSharp);
          linkDataSharp = "#" + urlPas(linkDataSharp);
          linkMain = linkMain.replace(new RegExp(linkDataSharpRegex, "g"), "");
        } else {
          linkDataSharp = "";
        }
        linkMain = linkMain.replaceAll("<link_single>", "&#x27;");
        linkMain = this.getToolDataRestore(linkMain, "slash");
        linkMain = unescapeHtml(linkMain);
        const linkTitle = escapeHtml(linkMain + linkDataSharp);
        let linkExist = "";
        if (linkMain !== "") {
          const dbData = this.getToolDatabaseFind(linkMain)?.title;
          if (!dbData) {
            if (!this.dataBacklink[linkMain]) {
              this.dataBacklink[linkMain] = {};
            }
            this.dataBacklink[linkMain]["no"] = "";
            linkExist = "opennamu_not_exist_link";
          } else {
            if (!this.dataBacklink[linkMain]) {
              this.dataBacklink[linkMain] = {};
            }
          }
          this.dataBacklink[linkMain][""] = "";
        }
        let linkSame = "";
        if (linkMain === this.docName) {
          linkSame = "opennamu_same_link";
        }
        linkMain = urlPas(linkMain);
        if (linkMain !== "") {
          linkMain = "/w/" + linkMain;
        }
        let linkSub = linkData[1] || "";
        const linkSubStorage = linkSub ? "" : linkMainOrg;
        this.linkCount += 1;
        const addStr = linkData[2] || "";
        const dataName = this.getToolDataStorage(
          `<a class="${linkExist} ${linkSame}" title="${linkTitle}" href="${linkMain}${linkDataSharp}">${linkSubStorage}`,
          "</a>",
          linkDataFull
        );
        this.renderData = this.renderData.replace(linkRegex, `<${dataName}>${linkSub}</${dataName}>` + addStr);
      }
      linkCountAll -= 1;
    }
  }
  // re.sub fix
  manageFootnote() {
    let footnoteNum = 0;
    const useFootnoteSet = this.config.useFootnoteSet;
    const useFootnoteNumber = this.config.useFootnoteNumber;
    const useViewRealFootnoteNum = this.config.useViewRealFootnoteNum;
    const footnoteRegex = /(?:\[\*((?:(?!\[\*|\]| ).)+)?(?: ((?:(?!\[\*|\]).)+))?\]|\[(각주|footnote)\])/i;
    let footnoteCountAll = (this.renderData.match(globalRegExp(footnoteRegex)) || []).length * 4;
    while (true) {
      footnoteNum += 1;
      const footnoteData = footnoteRegex.exec(this.renderData);
      if (footnoteCountAll < 0) {
        break;
      } else if (!footnoteData) {
        break;
      } else {
        const footnoteDataOriginal = footnoteData[0];
        const footnoteDataGroups = footnoteData.slice(1);
        if (footnoteDataGroups[2]) {
          this.renderData = this.renderData.replace(footnoteRegex, () => this.getToolFootnoteMake());
        } else {
          const footnoteNumStr = String(footnoteNum);
          let footnoteName = footnoteDataGroups[0] || footnoteNumStr;
          const footnoteNameAdd = footnoteDataGroups[0] ? ` (${footnoteNumStr})` : "";
          const footnoteTextData = footnoteDataGroups[1] || "";
          let fn = "";
          let rfn = "";
          let footVName = "";
          if (this.dataFootnoteAll[footnoteName] || this.dataFootnote[footnoteName]) {
            let footnoteFirst;
            if (this.dataFootnote[footnoteName]) {
              this.dataFootnote[footnoteName]["list"].push(footnoteNumStr);
              footnoteFirst = this.dataFootnote[footnoteName]["list"][0];
            } else {
              this.dataFootnote[footnoteName] = {
                list: [footnoteNumStr],
                data: footnoteTextData
              };
              footnoteFirst = this.dataFootnoteAll[footnoteName]["list"][0];
            }
            fn = this.docSet["docInclude"] + "fn_" + footnoteFirst;
            rfn = this.docSet["docInclude"] + "rfn_" + footnoteNumStr;
            if (useFootnoteNumber === "only_number") {
              footVName += footnoteFirst;
            } else {
              footVName += footnoteName;
            }
            if (useViewRealFootnoteNum === "on") {
              footVName += ` ${footnoteNumStr}`;
            }
          } else {
            this.dataFootnote[footnoteName] = {
              list: [footnoteNumStr],
              data: footnoteTextData
            };
            fn = this.docSet["docInclude"] + "fn_" + footnoteNumStr;
            rfn = this.docSet["docInclude"] + "rfn_" + footnoteNumStr;
            if (useFootnoteNumber === "only_number") {
              footVName += footnoteNumStr;
            } else {
              footVName += footnoteName;
            }
            if (useViewRealFootnoteNum === "on") {
              footVName += footnoteNameAdd;
            }
          }
          let dataName;
          if (useFootnoteSet === "spread") {
            dataName = this.getToolDataStorage(
              '<sup><a fn_target="' + fn + '" id="' + rfn + '" href="javascript:void(0);">(' + footVName + ')</a></sup><span class="opennamu_spead_footnote" id="' + rfn + '_load" style="display: none;"></span>',
              "",
              footnoteDataOriginal
            );
            this.renderDataJS += 'document.getElementById("' + rfn + '").addEventListener("click", function() { opennamu_do_footnote_spread("' + rfn + '", "' + fn + '"); });\n';
          } else if (useFootnoteSet === "popup") {
            dataName = this.getToolDataStorage(
              '<sup><a fn_target="' + fn + '" id="' + rfn + '" href="javascript:void(0);">(' + footVName + ')</a></sup><span class="opennamu_spead_footnote" id="' + rfn + '_load" style="display: none;"></span>',
              "",
              footnoteDataOriginal
            );
            this.renderDataJS += 'document.getElementById("' + rfn + '").addEventListener("click", function() { opennamu_do_footnote_spread("' + rfn + '", "' + fn + '"); });\n';
          } else if (useFootnoteSet === "popover") {
            dataName = this.getToolDataStorage(
              '<span id="' + rfn + '_over"><sup><a fn_target="' + fn + '" id="' + rfn + '" href="javascript:void(0);">(' + footVName + ')</a></sup><span class="opennamu_popup_footnote" id="' + rfn + '_load" style="display: none;"></span></span>',
              "",
              footnoteDataOriginal
            );
            this.renderDataJS += 'document.getElementById("' + rfn + '_over").addEventListener("click", function() { opennamu_do_footnote_popover("' + rfn + '", "' + fn + '", undefined, "open"); });\n';
            this.renderDataJS += 'document.addEventListener("click", function() { opennamu_do_footnote_popover("' + rfn + '", "' + fn + '", undefined, "close"); });\n';
          } else {
            dataName = this.getToolDataStorage(
              '<sup><a fn_target="' + fn + '" id="' + rfn + '" href="#' + fn + '">(' + footVName + ")</a></sup>",
              "",
              footnoteDataOriginal
            );
          }
          this.renderData = this.renderData.replace(footnoteRegex, `<${dataName}></${dataName}>`);
        }
        footnoteCountAll -= 1;
      }
    }
    this.renderData += "<footnote_category>";
    this.renderData += this.getToolFootnoteMake();
  }
  // re.sub fix
  manageText() {
    const doRenderTextBold = (match, ...groups) => {
      const data = groups[0];
      let dataName;
      const useBold = this.config.useBold;
      if (useBold === "delete") {
        return "";
      } else if (useBold === "change") {
        dataName = this.getToolDataStorage("", "", match);
      } else {
        dataName = this.getToolDataStorage("<b>", "</b>", match);
      }
      return `<${dataName}>${data}</${dataName}>`;
    };
    this.renderData = this.renderData.replace(/&#x27;&#x27;&#x27;((?:(?!&#x27;&#x27;&#x27;).)+)&#x27;&#x27;&#x27;/g, doRenderTextBold);
    const doRenderTextItalic = (match, p1) => {
      const data = p1;
      const dataName = this.getToolDataStorage("<i>", "</i>", match);
      return `<${dataName}>${data}</${dataName}>`;
    };
    this.renderData = this.renderData.replace(/&#x27;&#x27;((?:(?!&#x27;&#x27;).)+)&#x27;&#x27;/g, doRenderTextItalic);
    const doRenderTextUnder = (match, p1) => {
      const data = p1;
      const dataName = this.getToolDataStorage("<u>", "</u>", match);
      return `<${dataName}>${data}</${dataName}>`;
    };
    this.renderData = this.renderData.replace(/__((?:(?!__).)+)__/g, doRenderTextUnder);
    const doRenderTextSup = (match, p1) => {
      const data = p1;
      const dataName = this.getToolDataStorage("<sup>", "</sup>", match);
      return `<${dataName}>${data}</${dataName}>`;
    };
    this.renderData = this.renderData.replace(/\^\^\^((?:(?!\^\^\^).)+)\^\^\^/g, doRenderTextSup);
    this.renderData = this.renderData.replace(/\^\^((?:(?!\^\^).)+)\^\^/g, doRenderTextSup);
    const doRenderTextSub = (match, p1) => {
      const data = p1;
      const dataName = this.getToolDataStorage("<sub>", "</sub>", match);
      return `<${dataName}>${data}</${dataName}>`;
    };
    this.renderData = this.renderData.replace(/,,,(?:(?!,,,).)+,,,/g, doRenderTextSub);
    this.renderData = this.renderData.replace(/,,((?:(?!,,).)+),,/g, doRenderTextSub);
    const doRenderTextStrike = (match, p1) => {
      const data = p1;
      let dataName;
      const useStrike = this.config.useStrike;
      if (useStrike === "delete") {
        return "";
      } else if (useStrike === "change") {
        dataName = this.getToolDataStorage("", "", match);
      } else {
        dataName = this.getToolDataStorage("<s>", "</s>", match);
      }
      return `<${dataName}>${data}</${dataName}>`;
    };
    this.renderData = this.renderData.replace(/--((?:(?!--).)+)--/g, doRenderTextStrike);
    this.renderData = this.renderData.replace(/~~((?:(?!~~).)+)~~/g, doRenderTextStrike);
  }
  // re.sub fix
  manageHr() {
    const hrRegex = /\n-{4,}\n/;
    let hrCountMax = (this.renderData.match(new RegExp(hrRegex, "g")) || []).length * 3;
    while (true) {
      const hrData = hrRegex.exec(this.renderData);
      if (hrCountMax < 0) {
        break;
      } else if (!hrData) {
        break;
      } else {
        this.renderData = this.renderData.replace(hrRegex, "\n<front_br><hr><back_br>\n");
      }
      hrCountMax -= 1;
    }
  }
  manageHeading() {
    let tocList = [];
    const headingRegex = /\n((={1,6})(#?) ?([^\n]+))\n/;
    let headingCountAll = (this.renderData.match(globalRegExp(headingRegex)) || []).length * 3;
    let headingStack = [0, 0, 0, 0, 0, 0];
    let headingCount = 0;
    while (true) {
      headingCount += 1;
      const headingDataMatch = headingRegex.exec(this.renderData);
      if (!headingDataMatch) {
        break;
      } else if (headingCountAll < 0) {
        console.error("Error : render heading count overflow");
        break;
      }
      const headingDataOrg = headingDataMatch[0];
      let headingData = headingDataMatch.slice(1);
      const headingDataLastRegex = / ?(#?={1,6}[^=]*)$/;
      const headingDataLastMatch = headingData[3].match(headingDataLastRegex);
      let headingDataLast = headingDataLastMatch ? headingDataLastMatch[1] : "";
      const headingDataText = headingData[3].replace(globalRegExp(headingDataLastRegex), "");
      const headingDataDiff = headingData[2] + headingData[1];
      if (headingDataDiff !== headingDataLast) {
        let headingDataAll = headingData[0];
        for (let index = 6; index >= 1; index--) {
          const headingRestoreRegex = new RegExp("^={" + index + "}|={" + index + "}$");
          headingDataAll = headingDataAll.replace(headingRestoreRegex, "<heading_" + index + ">");
        }
        this.renderData = this.renderData.replace(headingRegex, "\n" + headingDataAll + "\n");
      } else {
        let headingLevel = headingData[1].length;
        headingStack[headingLevel - 1] += 1;
        for (let index = headingLevel; index < 6; index++) {
          headingStack[index] = 0;
        }
        const headingStackStr = headingStack.join(".").replace(/(\.0)+$/g, "");
        tocList.push(["", headingDataText]);
        let headingFolding = ["\u2296", "block", "1"];
        if (headingData[2]) headingFolding = ["\u2295", "none", "0.5"];
        let headingIdName = "edit_load_" + headingCount;
        if (this.docSet["docType"] !== "view") headingIdName = this.docSet["docInclude"] + "edit_load_" + headingCount;
        const dataName = this.getToolDataStorage(
          "<h" + headingLevel + '><span id="' + this.docSet["docInclude"] + "opennamu_heading_" + headingCount + '_sub" style="opacity: ' + headingFolding[2] + '">',
          ' <sub><a id="' + headingIdName + '" href="/edit_section/' + headingCount + "/" + urlPas(this.docName) + `">\u270E</a> <a href="javascript:void(0);" onclick="javascript:opennamu_heading_folding('` + this.docSet["docInclude"] + "opennamu_heading_" + headingCount + `', this);">` + headingFolding[0] + "</a></sub></span></h" + headingLevel + ">",
          headingDataOrg
        );
        const headingDataComplete = "\n<front_br>" + (headingCount != 1 ? "</div>" : "") + "<" + dataName + "><heading_stack>" + headingStackStr + "</heading_stack> " + headingDataText + "</" + dataName + '><div id="' + this.docSet["docInclude"] + "opennamu_heading_" + headingCount + '" style="display: ' + headingFolding[1] + ';"><back_br>\n';
        this.renderData = this.renderData.replace(headingRegex, headingDataComplete);
      }
      headingCountAll -= 1;
    }
    const headingEndCount = (this.renderData.match(/<heading_stack>/g) || []).length;
    for (let index = 5; index >= 0; index--) {
      const headingEndStackRegex = new RegExp("<heading_stack>" + "0\\.".repeat(index), "g");
      const headingEndMatchCount = (this.renderData.match(headingEndStackRegex) || []).length;
      if (headingEndMatchCount === headingEndCount) {
        this.renderData = this.renderData.replace(headingEndStackRegex, "<heading_stack>");
        break;
      }
    }
    const headingIdRegex = /<heading_stack>([^<>]+)<\/heading_stack>/;
    const headingIdRegexGlobal = /<heading_stack>([^<>]+)<\/heading_stack>/g;
    let match;
    const results = [];
    while ((match = headingIdRegexGlobal.exec(this.renderData)) !== null) {
      results.push(match);
    }
    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      const content = `<a href="#toc" id="s-${result[1]}">${result[1]}.</a>`;
      this.renderData = this.renderData.replace(headingIdRegex, content);
      tocList[index][0] = result[1];
    }
    for (let index = 1; index < 7; index++) {
      const headingRestoreRegex = new RegExp("<heading_" + index + ">", "g");
      this.renderData = this.renderData.replace(headingRestoreRegex, "=".repeat(index));
    }
    let tocData = "";
    if (tocList.length !== 0) {
      tocData = '<details class="opennamu_TOC" id="toc" open><summary class="opennamu_TOC_title"><span class="opennamu_TOC_label">\uBAA9\uCC28</span><span class="opennamu_TOC_toggle" aria-hidden="true"></span></summary><div class="opennamu_TOC_contents">';
    }
    for (let tocIndex = 0; tocIndex < tocList.length; tocIndex++) {
      const element = tocList[tocIndex];
      tocData += (tocIndex === 0 ? "" : "<br>") + '<span style="margin-left: 10px;"></span>'.repeat(element[0].split(".").length - 1) + '<span class="opennamu_TOC_list"><a class="opennamu_TOC_link" href="#s-' + element[0] + '">' + element[0] + ". <toc_inside>" + element[1] + "</toc_inside></a></span>";
    }
    if (tocData !== "") {
      tocData += "</div></details>";
      this.dataToc = tocData;
      this.renderData += "<toc_data>" + tocData + "</toc_data>";
    } else {
      this.dataToc = "";
    }
  }
  finalize() {
    this.renderData = this.renderData.replaceAll("<no_br>", "\n");
    this.renderData = this.renderData.replaceAll("<no_td>", "||");
    console.log(this.docSet);
    if (this.docSet["docType"] === "view") {
      if (this.dataCategory !== "") {
        let dataName = this.getToolDataStorage(this.dataCategory + "</span>", "</div>", "");
        const useCategorySet = this.config.useCategorySet;
        if (useCategorySet === "bottom") {
          if (/<footnote_category>/.test(this.renderData)) {
            this.renderData = this.renderData.replace(/<footnote_category>/, `<hr><${dataName}></${dataName}>`);
          } else {
            this.renderData += `<hr><${dataName}></${dataName}>`;
          }
        } else {
          this.renderData = this.renderData.replace(/<footnote_category>/, "");
          this.renderData = `<${dataName}></${dataName}>${this.renderData}`;
        }
      } else {
        this.renderData = this.renderData.replace(/<footnote_category>/, "");
      }
    } else {
      this.renderData = this.renderData.replace(/<footnote_category>/, "");
    }
    this.renderData = this.renderData.replace(/\n?<front_br>/g, "");
    this.renderData = this.renderData.replace(/<back_br>\n?/g, "");
    this.renderData = this.renderData.replace(/\n/g, "<br>");
    this.renderData = this.getToolDataRestore(this.renderData);
    this.tempALinkCount = 0;
    const handlerALink = (match, p1) => {
      const data = p1;
      if (data === "</a>") {
        if (this.tempALinkCount === 0) {
          return "";
        } else if (this.tempALinkCount > 1) {
          this.tempALinkCount -= 1;
          return "";
        } else {
          this.tempALinkCount -= 1;
          return match;
        }
      } else {
        if (this.tempALinkCount > 0) {
          this.tempALinkCount += 1;
          return "";
        } else {
          this.tempALinkCount += 1;
          return match;
        }
      }
    };
    this.renderData = this.renderData.replace(/(<a(?: [^<>]*)?>|<\/a>)/g, handlerALink);
    const handlerTocFilter = (match, p1) => {
      let data = p1.split(" ");
      if (data[0] === "a" || data[0] === "/a") {
        if (data.length > 3 && data[3] != 'href="javascript:void(0);"') {
          return `<${p1}>`;
        } else {
          return "";
        }
      } else {
        return "";
      }
    };
    const handlerToc = (match, p1) => {
      let data = p1.replace(/<\/?a(?: [^<>]*)?>/gi, "");
      data = data.replace(/<([^<>]*)>/g, handlerTocFilter);
      return data;
    };
    if (this.dataToc !== "") {
      this.renderData += "</div>";
      const tocSearchRegex = /<toc_data>((?:(?!<toc_data>|<\/toc_data>).)*)<\/toc_data>/;
      const tocDataOn = /<toc_need_part(?:_hide)?>/.test(this.renderData) ? 1 : 0;
      const tocData = this.renderData.match(tocSearchRegex) || [];
      let tocDataNew = tocData ? tocData[1] : "";
      this.dataToc = tocDataNew;
      this.dataToc = this.dataToc.replace(/<toc_inside>((?:(?!<toc_inside>|<\/toc_inside>).)*)<\/toc_inside>/g, handlerToc);
      const useTocSet = this.config.useTocSet;
      this.renderData = this.renderData.replace(new RegExp(tocSearchRegex), "");
      if (useTocSet === "off") {
        this.renderData = this.renderData.replace(/<toc_need_part(?:_hide)?>/g, "");
      } else {
        for (let i = 0; i < 20; i++) {
          this.renderData = this.renderData.replace(
            /<toc_need_part_hide>/,
            this.dataToc.replace(" open>", ">")
          );
          this.renderData = this.renderData.replace(/<toc_need_part>/, this.dataToc);
        }
        this.renderData = this.renderData.replace(/<toc_need_part(?:_hide)?>/g, "");
      }
      if (this.docSet["docType"] !== "view" || this.renderData.match(/<toc_no_auto>/) || useTocSet === "half_off" || useTocSet === "off" || tocDataOn === 1) {
        this.renderData = this.renderData.replace(/<toc_no_auto>/g, "");
      } else {
        this.renderData = this.renderData.replace(/(?=<h[1-6](?:\\s|)>)/, `<br>${this.dataToc}`);
      }
    } else {
      this.renderData = this.renderData.replace(/<toc_need_part(?:_hide)?>/g, "");
      this.renderData = this.renderData.replace(/<toc_no_auto>/g, "");
    }
    const handlerFootnote = (match, p1) => {
      const findRegex = new RegExp('<footnote_title id="' + p1 + '_title">((?:(?!<footnote_title|</footnote_title>).)*)</footnote_title>');
      let findData = this.renderData.match(findRegex);
      let findDataNew;
      if (findData) {
        findDataNew = findData[1];
        findDataNew = findDataNew.replace(/<[^<>]*>/g, "");
      } else {
        findDataNew = "";
      }
      findDataNew = findDataNew.replace(/&(?!#(?:x[0-9a-f]+|[0-9]+);|[a-z][a-z0-9]+;)/gi, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return '<a title="' + findDataNew + '"';
    };
    this.renderData = this.renderData.replace(/<a fn_target="([^"]+)"/g, handlerFootnote);
    this.renderDataJS += `document.querySelectorAll('details').forEach((el) => {new Accordion(el);});if(window.location.hash !== '' && document.getElementById(window.location.hash.replace(/^#/, ''))) {document.getElementById(window.location.hash.replace(/^#/, '')).focus();}
opennamu_do_ip_render();
`;
    const applyInlineFontSize = (pattern, size, lineHeight = 1.8) => {
      this.renderData = this.renderData.replace(pattern, (tag) => {
        const fontStyle = "font-size:" + size + "px !important;line-height:" + lineHeight + " !important;";
        const styleMatch = tag.match(/\sstyle=(["'])([\s\S]*?)\1/i);
        if (styleMatch) {
          const existingStyle = styleMatch[2].replace(/\s*;?\s*$/, ";");
          return tag.replace(styleMatch[0], " style=" + styleMatch[1] + existingStyle + fontStyle + styleMatch[1]);
        }
        return tag.replace(/>$/, ' style="' + fontStyle + '">');
      });
    };
    const headingSizes = [28, 21, 18, 16, 14, 13];
    headingSizes.forEach((size, index) => {
      applyInlineFontSize(new RegExp("<h" + (index + 1) + "\\b[^>]*>", "gi"), size, 1.4);
    });
    applyInlineFontSize(/<ul\b[^>]*>/gi, 14, 1.8);
    applyInlineFontSize(/<ol\b[^>]*>/gi, 14, 1.8);
    applyInlineFontSize(/<li\b[^>]*>/gi, 14, 1.8);
    applyInlineFontSize(/<table\b[^>]*>/gi, 14);
    applyInlineFontSize(/<code\b[^>]*>/gi, 14);
    applyInlineFontSize(/<([a-z][\w:-]*)\b([^>]*\bclass=["'][^"']*(?:wiki-toc|opennamu_TOC|wiki-footnote-tooltip)[^"']*["'][^>]*)>/gi, 12, 1.5);
    applyInlineFontSize(/<([a-z][\w:-]*)\b([^>]*\bclass=["'][^"']*(?:opennamu_footnote|wiki-footnotes)[^"']*["'][^>]*)>/gi, 12, 1.6);
    applyInlineFontSize(/<footnote_title\b[^>]*>/gi, 12, 1.6);
    applyInlineFontSize(/<([a-z][\w:-]*)\b([^>]*\bclass=["'][^"']*opennamu_category[^"']*["'][^>]*)>/gi, 12, 1.6);
    applyInlineFontSize(/<figcaption\b[^>]*>/gi, 14);
    applyInlineFontSize(/<a\b(?=[^>]*\bid=["'][^"']*(?:fn_|rfn_)[^"']*["'])[^>]*>/gi, 12, 1.5);
    this.renderData = '<div style="font-size:14px !important; line-height:1.8 !important;">' + this.renderData + "</div>";
  }
  manageAfterwork() {
  }
  parse() {
    this.manageRemark();
    this.manageIncludeDefault();
    this.manageSlash();
    this.manageMiddle();
    this.manageInclude();
    this.manageMath();
    this.manageBracketTables();
    this.manageTable();
    this.manageList();
    this.manageMacro();
    this.manageLink();
    this.manageText();
    this.manageHr();
    if (this.doType === "exter") {
      this.manageFootnote();
      this.manageHeading();
      this.finalize();
      this.renderDataJS = `window.addEventListener("load", function(){ ${this.renderDataJS} })`;
    } else {
      this.renderData = this.renderData.replace(/\|\|/g, "<no_td>");
      this.renderData = this.renderData.replace(/\n/g, "<no_br>");
    }
    this.manageAfterwork();
    const dataBacklinkDict = this.dataBacklink;
    const dataBacklinkList = [];
    for (const forA of Object.keys(this.dataBacklink)) {
      for (const forB of Object.keys(this.dataBacklink[forA])) {
        dataBacklinkList.push([this.docName, forA, forB, this.dataBacklink[forA][forB]]);
      }
    }
    return [
      this.renderData,
      this.renderDataJS,
      {
        backlink: dataBacklinkList,
        backlink_dict: dataBacklinkDict,
        footnote: this.dataFootnoteAll,
        category: this.dataCategoryList,
        temp_storage: [this.dataTempStorage, this.dataTempStorageCount],
        link_count: this.linkCount
        // redirect: this.dataRedirect
      }
    ];
  }
};

// worker/src/index.js
function response(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}
function getCors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGIN || "https://hiakdhs323-cmd.github.io").split(",").map((v) => v.trim());
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Admin-Bootstrap-Secret",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  };
}
function cleanTitle(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120);
}
function namuFileHash(data) {
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const value = Math.imul(hash ^ 2654435769 * (i + 1), 2246822507);
    parts.push((value >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 56);
}
async function authRateLimited(request, env, action, limit, windowMs) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS auth_rate_limits (ip TEXT NOT NULL, action TEXT NOT NULL, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL, PRIMARY KEY(ip, action))").run();
  const ip = String(request.headers.get("CF-Connecting-IP") || "unknown").slice(0, 64);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const row = await env.DB.prepare("SELECT attempts, window_started_at FROM auth_rate_limits WHERE ip = ? AND action = ?").bind(ip, action).first();
  const age = row ? Date.now() - Date.parse(row.window_started_at) : Infinity;
  if (row && age >= 0 && age < windowMs && Number(row.attempts) >= limit) return true;
  if (!row || age < 0 || age >= windowMs) {
    await env.DB.prepare("INSERT INTO auth_rate_limits (ip, action, attempts, window_started_at) VALUES (?, ?, 1, ?) ON CONFLICT(ip, action) DO UPDATE SET attempts = 1, window_started_at = excluded.window_started_at").bind(ip, action, now).run();
  } else {
    await env.DB.prepare("UPDATE auth_rate_limits SET attempts = attempts + 1 WHERE ip = ? AND action = ?").bind(ip, action).run();
  }
  return false;
}
async function ensureAdminTokenTable(env) {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_tokens (id TEXT PRIMARY KEY NOT NULL, token_hash TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_auth_attempts (ip TEXT PRIMARY KEY NOT NULL, attempts INTEGER NOT NULL, window_started_at TEXT NOT NULL)").run();
}
function constantTimeEqual(left, right) {
  const a = String(left || ""), b = String(right || "");
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return difference === 0;
}
async function isAdminRequest(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return false;
  await ensureAdminTokenTable(env);
  const ip = String(request.headers.get("CF-Connecting-IP") || "unknown").slice(0, 64);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rate = await env.DB.prepare("SELECT attempts, window_started_at FROM admin_auth_attempts WHERE ip = ?").bind(ip).first();
  const windowAge = rate ? Date.now() - Date.parse(rate.window_started_at) : Infinity;
  if (rate && windowAge >= 0 && windowAge < 15 * 60 * 1e3 && Number(rate.attempts) >= 10) return false;
  const presented = authorization.slice(7);
  const saved = await env.DB.prepare("SELECT token_hash FROM admin_tokens WHERE id = 'primary'").first();
  let valid = false;
  if (saved) {
    valid = constantTimeEqual(await sha256(presented), saved.token_hash);
  } else if (env.ADMIN_TOKEN) {
    valid = constantTimeEqual(presented, env.ADMIN_TOKEN);
  }
  if (valid) {
    if (!saved) {
      await env.DB.prepare("INSERT INTO admin_tokens (id, token_hash, updated_at) VALUES ('primary', ?, ?) ON CONFLICT(id) DO NOTHING").bind(await sha256(presented), now).run();
      const confirmed = await env.DB.prepare("SELECT token_hash FROM admin_tokens WHERE id = 'primary'").first();
      valid = Boolean(confirmed && constantTimeEqual(await sha256(presented), confirmed.token_hash));
    }
    if (valid) {
      await env.DB.prepare("DELETE FROM admin_auth_attempts WHERE ip = ?").bind(ip).run();
      return true;
    }
  }
  if (!rate || windowAge < 0 || windowAge >= 15 * 60 * 1e3) {
    await env.DB.prepare("INSERT INTO admin_auth_attempts (ip, attempts, window_started_at) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET attempts = 1, window_started_at = excluded.window_started_at").bind(ip, now).run();
  } else {
    await env.DB.prepare("UPDATE admin_auth_attempts SET attempts = attempts + 1 WHERE ip = ?").bind(ip).run();
  }
  return false;
}
async function currentUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const tokenHash = await sha256(auth.slice(7));
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const user = await env.DB.prepare("SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?").bind(tokenHash, now).first();
  if (user) {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS wiki_admins (user_id TEXT PRIMARY KEY NOT NULL, granted_at TEXT NOT NULL, granted_by TEXT NOT NULL)").run();
    const admin = await env.DB.prepare("SELECT user_id FROM wiki_admins WHERE user_id = ?").bind(user.id).first();
    return { username: user.username, role: admin ? "admin" : "user", isAdmin: Boolean(admin) };
  }
  if (await isAdminRequest(request, env)) return { username: "\uC704\uD0A4 \uAD00\uB9AC\uC790", role: "admin", isAdmin: true };
  return null;
}
function anonymousEditorIdentity(request) {
  const raw = String(request.headers.get("CF-Connecting-IP") || "").trim().toLowerCase();
  let label = "IP \uC54C \uC218 \uC5C6\uC74C";
  const ipv4 = raw.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4 && ipv4.slice(1).every((part) => Number(part) >= 0 && Number(part) <= 255)) {
    label = "IP " + ipv4[1] + "." + ipv4[2] + "." + ipv4[3] + ".*";
  } else if (raw.includes(":")) {
    const groups = raw.split("%")[0].split(":").filter(Boolean);
    label = groups.length >= 4 ? "IP " + groups.slice(0, 4).join(":") + ":*" : "IP IPv6:*";
  }
  return { username: label, role: "anonymous", isAdmin: false, isAnonymous: true };
}
var pageProtectionSchemaPromise = null;
var pageAliasSchemaPromise = null;
var pageLinkColorsSchemaPromise = null;
var imageSchemaPromise = null;
async function ensurePageProtectionSchema(env) {
  if (!pageProtectionSchemaPromise) {
    pageProtectionSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS page_protections (title TEXT PRIMARY KEY NOT NULL, level TEXT NOT NULL CHECK(level IN ('registered','admin')), reason TEXT NOT NULL DEFAULT '', protected_by TEXT NOT NULL, updated_at TEXT NOT NULL)").run().catch((error) => {
      pageProtectionSchemaPromise = null;
      throw error;
    });
  }
  await pageProtectionSchemaPromise;
}
async function checkPageEditPermission(env, user, title, protectionTitle = title) {
  if (!user) return { status: 401, error: "\uBB38\uC11C\uB97C \uD3B8\uC9D1\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." };
  if (title === "\uB300\uBB38" && !user.isAdmin) return { status: 403, error: "\uB300\uBB38\uC740 \uC704\uD0A4 \uAD00\uB9AC\uC790\uB9CC \uD3B8\uC9D1\uD558\uAC70\uB098 \uBCF5\uC6D0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." };
  await ensurePageProtectionSchema(env);
  const protection = await env.DB.prepare("SELECT level FROM page_protections WHERE title = ?").bind(protectionTitle).first();
  if (protection?.level === "admin" && !user.isAdmin) {
    return { status: 403, error: "\uC774 \uBB38\uC11C\uB294 \uAD00\uB9AC\uC790\uB9CC \uD3B8\uC9D1\uD558\uAC70\uB098 \uBCF5\uC6D0\uD560 \uC218 \uC788\uB3C4\uB85D \uBCF4\uD638\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4." };
  }
  if (protection?.level === "registered" && !user.isAdmin && user.role !== "user") {
    return { status: 403, error: "\uC774 \uBB38\uC11C\uB294 \uB85C\uADF8\uC778\uD55C \uD68C\uC6D0\uB9CC \uD3B8\uC9D1\uD558\uAC70\uB098 \uBCF5\uC6D0\uD560 \uC218 \uC788\uB3C4\uB85D \uBCF4\uD638\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4." };
  }
  return null;
}
async function ensurePageAliasSchema(env) {
  if (!pageAliasSchemaPromise) {
    pageAliasSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS page_aliases (alias TEXT PRIMARY KEY COLLATE NOCASE, title TEXT NOT NULL, created_at TEXT NOT NULL)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_page_aliases_title ON page_aliases(title)").run();
    })().catch((error) => {
      pageAliasSchemaPromise = null;
      throw error;
    });
  }
  await pageAliasSchemaPromise;
}
async function ensurePageLinkColorsSchema(env) {
  if (!pageLinkColorsSchemaPromise) {
    pageLinkColorsSchemaPromise = env.DB.prepare("CREATE TABLE IF NOT EXISTS page_link_colors (title TEXT PRIMARY KEY NOT NULL, config_json TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL DEFAULT '')").run().catch((error) => {
      pageLinkColorsSchemaPromise = null;
      throw error;
    });
  }
  await pageLinkColorsSchemaPromise;
}
async function ensureImageSchema(env) {
  if (!imageSchemaPromise) {
    imageSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY NOT NULL, content_type TEXT NOT NULL, data_base64 TEXT NOT NULL, filename TEXT NOT NULL, created_at TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '')").run();
      const columns = await env.DB.prepare("PRAGMA table_info(images)").all();
      if (!(columns.results || []).some((column) => column.name === "owner")) {
        await env.DB.prepare("ALTER TABLE images ADD COLUMN owner TEXT NOT NULL DEFAULT ''").run();
      }
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS image_aliases (alias TEXT PRIMARY KEY COLLATE NOCASE, image_id TEXT NOT NULL, created_at TEXT NOT NULL)").run();
    })().catch((error) => {
      imageSchemaPromise = null;
      throw error;
    });
  }
  await imageSchemaPromise;
}
var discussionSchemaPromise = null;
async function ensureDiscussionSchema(env) {
  if (!discussionSchemaPromise) {
    discussionSchemaPromise = (async () => {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS discussions (id INTEGER PRIMARY KEY AUTOINCREMENT, page_title TEXT NOT NULL DEFAULT '', title TEXT NOT NULL, body TEXT NOT NULL, author TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_post_at TEXT NOT NULL, reply_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')), deleted_at TEXT NOT NULL DEFAULT '', deleted_by TEXT NOT NULL DEFAULT '')").run();
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS discussion_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, discussion_id INTEGER NOT NULL, body TEXT NOT NULL, author TEXT NOT NULL, created_at TEXT NOT NULL, edited_at TEXT NOT NULL DEFAULT '', is_deleted INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(discussion_id) REFERENCES discussions(id))").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_discussions_last_post ON discussions(deleted_at, last_post_at DESC)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_discussions_page_title ON discussions(page_title, deleted_at, last_post_at DESC)").run();
      await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_discussion_posts_topic ON discussion_posts(discussion_id, id)").run();
    })().catch((error) => {
      discussionSchemaPromise = null;
      throw error;
    });
  }
  await discussionSchemaPromise;
}
function cleanImageName(value, contentType) {
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg" }[contentType] || "img";
  let name = String(value || "").normalize("NFC").replace(/[\\/:*?"<>|]/g, "_").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  name = name.replace(/\.[^.]*$/, "").replace(/[. ]+$/g, "").slice(0, 100);
  if (!name) name = "image";
  return name + "." + extension;
}
function validateSvgUpload(text) {
  const svg = String(text || "").trim();
  if (!svg || svg.length > 1024 * 1024) throw new Error("SVG \uD30C\uC77C\uC740 1MB \uC774\uD558\uB9CC \uC9C0\uC6D0\uD569\uB2C8\uB2E4.");
  if (!/^<svg(?:\s|>)/i.test(svg.replace(/^<\?xml[^>]*>\s*/i, ""))) throw new Error("\uC62C\uBC14\uB978 SVG \uD30C\uC77C\uC774 \uC544\uB2D9\uB2C8\uB2E4.");
  if (/<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject|iframe|object|embed|audio|video|use)\b|\bon[a-z]+\s*=|javascript\s*:|data\s*:\s*text\/html|url\s*\(\s*['"]?\s*(?:https?:|\/\/|javascript:)|\b(?:href|xlink:href)\s*=\s*['"]\s*(?:https?:|\/\/|javascript:|data:)/i.test(svg)) {
    throw new Error("\uBCF4\uC548\uC0C1 \uC2A4\uD06C\uB9BD\uD2B8, \uC678\uBD80 \uB9AC\uC18C\uC2A4 \uB610\uB294 \uC2E4\uD589 \uAC00\uB2A5\uD55C \uC694\uC18C\uAC00 \uD3EC\uD568\uB41C SVG\uB294 \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
  }
  if (!/<\/svg\s*>\s*$/i.test(svg)) throw new Error("SVG \uBB38\uC11C\uAC00 \uC62C\uBC14\uB974\uAC8C \uB2EB\uD600 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
  return svg;
}
function makeAdminToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function imageNameMatches(filename, hash, extension) {
  const value = String(filename || "");
  const dot = value.lastIndexOf(".");
  const base = dot > 0 ? value.slice(0, dot) : value;
  const ext = dot > 0 ? value.slice(dot + 1).toLowerCase() : "jpg";
  return namuFileHash(base).toLowerCase() === hash.toLowerCase() && ext === String(extension || "").toLowerCase();
}
var SERVER_WIKI_TAGS = new Set("A ABBR B BDI BDO BLOCKQUOTE BR CAPTION CENTER CODE COL COLGROUP DD DEL DETAILS DIV DL DT EM FIGCAPTION FIGURE FONT FOOTNOTE_TITLE H1 H2 H3 H4 H5 H6 HR I IFRAME IMG INS KBD LI MARK OL P PRE Q RUBY RT RP S SAMP SMALL SPAN STRIKE STRONG STYLE SUB SUMMARY SUP TABLE TBODY TD TFOOT TH THEAD TR TT U UL VAR VIDEO AUDIO SOURCE".split(" "));
var SERVER_WIKI_ATTRS = new Set("alt allow allowfullscreen class colspan data-opennamu-action fn_target frameborder height href id lang loading open poster referrerpolicy rel rowspan src start style target title type width align valign controls loop muted".split(" "));
function sanitizeServerWikiStyle(raw) {
  const allowed = /* @__PURE__ */ new Set(["color", "background", "background-color", "font-size", "font-weight", "font-style", "text-align", "text-decoration", "text-transform", "line-height", "letter-spacing", "word-spacing", "width", "max-width", "min-width", "height", "max-height", "min-height", "margin", "margin-left", "margin-right", "margin-top", "margin-bottom", "padding", "border", "border-color", "border-width", "border-style", "border-radius", "border-collapse", "float", "clear", "display", "vertical-align", "white-space", "list-style-type", "image-rendering", "object-fit", "overflow", "overflow-wrap", "box-shadow", "opacity"]);
  const themeVariable = /^--aonwiki-table-(?:(?:bg|fg|border)-(?:light|dark)|auto-fg-(?:light|dark))$/;
  const safeColor = /^(?:#[0-9a-f]{3,8}|[a-z]{1,24}|(?:rgba?|hsla?)\([\d.%+\-/ ,]+\))$/i;
  const output = [];
  String(raw || "").split(";").forEach((entry) => {
    const at = entry.indexOf(":");
    if (at < 1) return;
    const rawKey = entry.slice(0, at).trim().toLowerCase();
    const key = rawKey.replace(/^\\2d\s+\\2d\s+/i, "--");
    const value = entry.slice(at + 1).trim();
    const isThemeVariable = themeVariable.test(key);
    if (!allowed.has(key) && !isThemeVariable || !value || /url\s*\(|expression|javascript|@import|[<>{}]/i.test(value)) return;
    if (isThemeVariable && !safeColor.test(value)) return;
    output.push(key + ":" + value);
  });
  return output.join(";");
}
var ADMIN_LINK_COLOR_KEYS = /* @__PURE__ */ new Set(["light", "dark", "visited-light", "visited-dark", "hover-light", "hover-dark"]);
function normalizeAdminLinkColor(value) {
  const color = String(value || "").trim();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return color.toLowerCase();
  if (/^[a-z]{1,20}$/i.test(color) && !/^(?:inherit|initial|unset|revert|revert-layer|currentcolor)$/i.test(color)) return color.toLowerCase();
  if (/^rgba?\(\s*\d{1,3}(?:\.\d+)?%?(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%?(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%?(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i.test(color)) return color;
  if (/^hsla?\(\s*-?\d+(?:\.\d+)?(?:deg|rad|turn)?(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%(?:\s*,\s*|\s+)\d{1,3}(?:\.\d+)?%(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i.test(color)) return color;
  return "";
}
function extractAdminLinkColors(source) {
  const colors = {}, errors = [];
  let found = false;
  const input = String(source || "");
  const content = input.replace(/^\{\{\{#!linkcolor[ \t]*\r?\n([\s\S]*?)^\}\}\}[ \t]*(?:\r?\n|$)/gim, (_block, body) => {
    found = true;
    for (const [index, rawLine] of String(body || "").split(/\r?\n/).entries()) {
      const line = rawLine.trim();
      if (!line) continue;
      const separator = line.indexOf(":");
      if (separator < 1) {
        errors.push("\uB9C1\uD06C \uC0C9\uC0C1 \uC124\uC815 " + (index + 1) + "\uBC88\uC9F8 \uC904\uC740 key: color \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
        continue;
      }
      const key = line.slice(0, separator).trim().toLowerCase();
      if (!ADMIN_LINK_COLOR_KEYS.has(key)) {
        errors.push("\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uB9C1\uD06C \uC0C9\uC0C1 \uD56D\uBAA9\uC785\uB2C8\uB2E4: " + key);
        continue;
      }
      const normalized = normalizeAdminLinkColor(line.slice(separator + 1).trim());
      if (!normalized) {
        errors.push("\uC62C\uBC14\uB974\uC9C0 \uC54A\uC740 \uC0C9\uC0C1 \uAC12\uC785\uB2C8\uB2E4: " + key);
        continue;
      }
      colors[key] = normalized;
    }
    return "";
  });
  if (/\{\{\{#!linkcolor\b/i.test(input) && !found) errors.push("\uB9C1\uD06C \uC0C9\uC0C1 \uC124\uC815 \uBE14\uB85D\uC744 }}} \uB85C \uB2EB\uC544\uC57C \uD569\uB2C8\uB2E4.");
  return { content, colors, found, errors };
}
function buildAdminLinkColorMarkup(html, colors) {
  const selectors = {
    light: 'html[data-theme="light"] .aonwiki-page-content a:not(.opennamu_not_exist_link)',
    dark: 'html[data-theme="dark"] .aonwiki-page-content a:not(.opennamu_not_exist_link)',
    "visited-light": 'html[data-theme="light"] .aonwiki-page-content a:not(.opennamu_not_exist_link):visited',
    "visited-dark": 'html[data-theme="dark"] .aonwiki-page-content a:not(.opennamu_not_exist_link):visited',
    "hover-light": 'html[data-theme="light"] .aonwiki-page-content a:not(.opennamu_not_exist_link):hover',
    "hover-dark": 'html[data-theme="dark"] .aonwiki-page-content a:not(.opennamu_not_exist_link):hover'
  };
  const rules = [];
  for (const [key, selector] of Object.entries(selectors)) {
    const color = normalizeAdminLinkColor(colors?.[key]);
    if (color) rules.push(selector + "{color:" + color + " !important}");
  }
  if (!rules.length) return String(html || "");
  rules.push('.aonwiki-page-content span[style*="color"] a, .aonwiki-page-content span[style*="color"] a:visited, .aonwiki-page-content span[style*="color"] a:hover{color:inherit !important}');
  return "<style>" + rules.join("\n") + '</style><div class="aonwiki-page-content">' + String(html || "") + "</div>";
}
async function getPageLinkColors(env, title) {
  await ensurePageLinkColorsSchema(env);
  const row = await env.DB.prepare("SELECT config_json FROM page_link_colors WHERE title = ?").bind(title).first();
  if (!row) return {};
  try {
    const saved = JSON.parse(row.config_json || "{}"), colors = {};
    for (const key of ADMIN_LINK_COLOR_KEYS) {
      const color = normalizeAdminLinkColor(saved?.[key]);
      if (color) colors[key] = color;
    }
    return colors;
  } catch {
    return {};
  }
}
async function savePageLinkColors(env, title, extracted, editor) {
  await ensurePageLinkColorsSchema(env);
  if (!extracted?.found || !Object.keys(extracted.colors || {}).length) {
    await env.DB.prepare("DELETE FROM page_link_colors WHERE title = ?").bind(title).run();
    return;
  }
  await env.DB.prepare("INSERT INTO page_link_colors (title, config_json, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(title) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by").bind(title, JSON.stringify(extracted.colors), (/* @__PURE__ */ new Date()).toISOString(), String(editor || "")).run();
}
function collectIncludeTargets(source) {
  const targets = [];
  for (const match of String(source || "").matchAll(/\[include\(((?:(?!\[include\(|\)\]).)+)\)\]/gi)) {
    const first = String(match[1] || "").split(",")[0].trim();
    if (first && !first.includes("=")) targets.push(first);
  }
  return targets;
}
function collectCategoryTargets(source) {
  const targets = [];
  for (const match of String(source || "").matchAll(/\[\[(?:분류|category):([^\]|]+)(?:\|[^\]]*)?\]\]/gi)) {
    const name = String(match[1] || "").trim();
    if (name) targets.push(name);
  }
  return targets;
}
function collectWikiLinkTargets(source) {
  const targets = /* @__PURE__ */ new Set();
  for (const match of String(source || "").matchAll(/\[\[([^\]]+)\]\]/g)) {
    let target = String(match[1] || "").split("|")[0].trim();
    if (!target || target.startsWith("#") || /^https?:\/\//i.test(target)) continue;
    const hash = target.indexOf("#");
    if (hash >= 0) target = target.slice(0, hash).trim();
    if (!target) continue;
    if (/^(?:분류|category):/i.test(target)) {
      targets.add("category:" + target.replace(/^(?:분류|category):/i, ""));
    } else if (/^(?:파일|file):/i.test(target)) {
      targets.add("file:" + target.replace(/^(?:파일|file):/i, ""));
    } else {
      targets.add(target);
    }
  }
  return [...targets];
}
async function buildNamuServerDatabase(env, title, content) {
  const records = /* @__PURE__ */ new Map([[title, { title, data: String(content || "") }]]);
  const visitedIncludes = /* @__PURE__ */ new Set([title]);
  let pendingIncludes = collectIncludeTargets(content);
  let includedCount = 0;
  const maxIncludes = 50;
  for (let depth = 0; depth < 4 && pendingIncludes.length && includedCount < maxIncludes; depth++) {
    const batch = [...new Set(pendingIncludes)].filter((name) => name && !visitedIncludes.has(name)).slice(0, Math.min(40, maxIncludes - includedCount));
    pendingIncludes = [];
    if (!batch.length) break;
    batch.forEach((name) => visitedIncludes.add(name));
    const placeholders = batch.map(() => "?").join(",");
    const result = await env.DB.prepare(
      "SELECT title, content FROM pages WHERE title IN (" + placeholders + ")"
    ).bind(...batch).all();
    for (const page of result.results || []) {
      const item = { title: page.title, data: String(page.content || "") };
      records.set(page.title, item);
      includedCount++;
      pendingIncludes.push(...collectIncludeTargets(item.data));
      if (includedCount >= maxIncludes) break;
    }
  }
  const allMarkup = [String(content || ""), ...[...records.values()].map((item) => item.data || "")].join("\n");
  const linkTargets = new Set(collectWikiLinkTargets(allMarkup));
  const categoryAliases = new Set(
    collectCategoryTargets(allMarkup).map((name) => "category:" + name)
  );
  for (const alias of categoryAliases) linkTargets.delete(alias);
  const documentTargets = [...linkTargets].filter((name) => !name.startsWith("file:") && !records.has(name));
  const documentQueries = [];
  for (let index = 0; index < documentTargets.length; index += 90) {
    const batch = documentTargets.slice(index, index + 90);
    const placeholders = batch.map(() => "?").join(",");
    documentQueries.push(
      env.DB.prepare("SELECT title FROM pages WHERE title IN (" + placeholders + ")").bind(...batch).all()
    );
  }
  const imageQueries = [];
  if (/\[\[(?:파일|file):/i.test(allMarkup)) {
    await ensureImageSchema(env);
    imageQueries.push(
      env.DB.prepare("SELECT filename FROM images").all(),
      env.DB.prepare("SELECT alias FROM image_aliases").all()
    );
  }
  const [pageCount, ...lookups] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS total FROM pages").first(),
    ...documentQueries,
    ...imageQueries
  ]);
  for (const result of lookups) {
    for (const row of result.results || []) {
      const key = row.title || "file:" + (row.filename || row.alias);
      if (key) records.set(key, { title: key, data: "" });
    }
  }
  for (const categoryTitle of categoryAliases) {
    records.set(categoryTitle, { title: categoryTitle, data: "" });
  }
  return {
    data: new Array(Math.max(0, Number(pageCount?.total) || 0)),
    lookup: new Map(records)
  };
}
async function sanitizeServerWikiHtml(markup) {
  const input = new Response(String(markup || ""), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  const rewritten = new HTMLRewriter().on("*", {
    element(element) {
      const tag = String(element.tagName || "").toUpperCase();
      if (["SCRIPT", "STYLE", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "LINK", "META"].includes(tag)) {
        element.remove();
        return;
      }
      if (!SERVER_WIKI_TAGS.has(tag)) {
        element.removeAndKeepContent();
        return;
      }
      for (const [rawName, rawValue] of [...element.attributes]) {
        const name = String(rawName).toLowerCase(), value = String(rawValue || "");
        if (name === "onclick") {
          if (tag === "A" && value.includes("opennamu_heading_folding")) element.setAttribute("data-opennamu-action", value);
          element.removeAttribute(rawName);
          continue;
        }
        if (name.startsWith("on") || !SERVER_WIKI_ATTRS.has(name)) {
          element.removeAttribute(rawName);
          continue;
        }
        if (name === "style") {
          const safe = sanitizeServerWikiStyle(value);
          if (safe) element.setAttribute("style", safe);
          else element.removeAttribute("style");
          continue;
        }
        if (["href", "src", "poster"].includes(name) && /^\s*(?:javascript|data|vbscript):/i.test(value)) {
          element.removeAttribute(rawName);
          continue;
        }
        if (name === "href" && /^\s*\/\//.test(value)) element.removeAttribute(rawName);
      }
      if (tag === "A") {
        const href = element.getAttribute("href") || "";
        if (/^https?:\/\//i.test(href)) {
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
        }
      }
      if (tag === "A") {
        const classes = (element.getAttribute("class") || "").split(/\s+/);
        if (classes.includes("opennamu_not_exist_link")) {
          const current = element.getAttribute("style") || "";
          const cleaned = current.split(";").filter((part) => !/^\s*(?:color|text-decoration)(?:\s|:)/i.test(part)).join(";");
          element.setAttribute("style", (cleaned ? cleaned.replace(/;?$/, ";") : "") + "color:#d1242f;text-decoration:underline;");
        }
      }
      if (tag === "IFRAME") {
        const src = element.getAttribute("src") || "";
        const allowedHosts = /* @__PURE__ */ new Set(["www.youtube.com", "youtube.com", "www.instagram.com", "www.facebook.com", "www.tiktok.com", "twitframe.com", "tv.kakao.com", "tv.naver.com", "embed.nicovideo.jp", "player.vimeo.com"]);
        try {
          const parsed = new URL(src);
          if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
            element.remove();
            return;
          }
          element.setAttribute("src", parsed.href);
          element.setAttribute("loading", "lazy");
          element.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
          element.setAttribute("allowfullscreen", "");
        } catch {
          element.remove();
          return;
        }
      }
    }
  }).transform(input);
  return await rewritten.text();
}
var namuRenderCache = /* @__PURE__ */ new Map();
var namuRenderPending = /* @__PURE__ */ new Map();
var namuRenderCacheSchemaPromise = null;
async function ensureNamuRenderCacheSchema(env) {
  if (!namuRenderCacheSchemaPromise) {
    namuRenderCacheSchemaPromise = env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS namu_render_cache (title TEXT PRIMARY KEY NOT NULL, source_hash TEXT NOT NULL, html TEXT NOT NULL, metadata_json TEXT NOT NULL DEFAULT '{}', updated_at TEXT NOT NULL)"
    ).run().catch((error) => {
      namuRenderCacheSchemaPromise = null;
      throw error;
    });
  }
  await namuRenderCacheSchemaPromise;
}
async function clearPersistentNamuRenderCache(env) {
  try {
    await ensureNamuRenderCacheSchema(env);
    await env.DB.prepare("DELETE FROM namu_render_cache").run();
  } catch (error) {
    console.warn("AonWiki persistent render cache clear failed:", error);
  }
}
var namuPageResponseCache = /* @__PURE__ */ new Map();
var namuPageResponsePending = /* @__PURE__ */ new Map();
function clearNamuPageResponseCache() {
  namuPageResponseCache.clear();
  namuPageResponsePending.clear();
}
function invalidateNamuServerIndexes() {
  namuRenderCache.clear();
  namuRenderPending.clear();
  clearNamuPageResponseCache();
}
function parseTableColorRgb(value) {
  const input = String(value || "").trim().toLowerCase();
  const named = { black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", yellow: "#ffff00", orange: "#ffa500", purple: "#800080", gray: "#808080", grey: "#808080", navy: "#000080", teal: "#008080" };
  const color = named[input] || input;
  let match = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (match) {
    const hex = match[1].length === 3 ? match[1].split("").map((c) => c + c).join("") : match[1];
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  match = color.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (match) return [Number(match[1]), Number(match[2]), Number(match[3])];
  return null;
}
function tableLuminance(rgb) {
  const linear = (value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
}
function tableContrast(a, b) {
  const x = tableLuminance(a), y = tableLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function chooseTableTextColor(backgroundValue, foregroundValue, theme) {
  const canvas = theme === "dark" ? [26, 29, 32] : [255, 255, 255];
  const background = parseTableColorRgb(backgroundValue) || canvas;
  const foreground = parseTableColorRgb(foregroundValue);
  if (foreground && tableContrast(foreground, background) >= 4.5) return foregroundValue;
  const black = [0, 0, 0], white = [255, 255, 255];
  return tableContrast(black, background) >= tableContrast(white, background) ? "#000000" : "#ffffff";
}
function getInlineStyleProperties(element) {
  const properties = {};
  const style = element.getAttribute("style") || "";
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const name = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (name && value) properties[name] = value;
  }
  return properties;
}
async function applyTableTextContrast(markup) {
  const tableStack = [];
  const rowStack = [];
  const getThemeValue = (levels, key, theme) => {
    for (const properties of levels) {
      const paired = properties["--aonwiki-table-" + key + "-" + theme];
      if (paired) return paired;
      if (key === "bg") {
        const fixed = properties["background-color"] || properties.background || "";
        if (fixed && !/^transparent$/i.test(fixed)) return fixed;
      } else if (key === "fg" && properties.color && !/^var\(/i.test(properties.color)) {
        return properties.color;
      }
    }
    return "";
  };
  const rewriter = new HTMLRewriter().on("table", { element(el) {
    tableStack.push(getInlineStyleProperties(el));
  }, endTag() {
    tableStack.pop();
  } }).on("tr", { element(el) {
    rowStack.push(getInlineStyleProperties(el));
  }, endTag() {
    rowStack.pop();
  } }).on("td, th", {
    element(el) {
      const levels = [getInlineStyleProperties(el), rowStack[rowStack.length - 1] || {}, tableStack[tableStack.length - 1] || {}];
      const authoredLightBg = getThemeValue(levels, "bg", "light");
      const authoredDarkBg = getThemeValue(levels, "bg", "dark");
      const lightBg = authoredLightBg || authoredDarkBg || "#ffffff";
      const darkBg = authoredDarkBg || authoredLightBg || "#1a1d20";
      const lightFg = getThemeValue(levels, "fg", "light");
      const darkFg = getThemeValue(levels, "fg", "dark");
      const lightText = chooseTableTextColor(lightBg, lightFg, "light");
      const darkText = chooseTableTextColor(darkBg, darkFg, "dark");
      const current = el.getAttribute("style") || "";
      el.setAttribute(
        "style",
        (current.trim() ? current.trim().replace(/;?$/, ";") : "") + "--aonwiki-table-auto-fg-light:" + lightText + ";--aonwiki-table-auto-fg-dark:" + darkText + ";color:var(--aonwiki-table-auto-fg-light,var(--wiki-text));"
      );
      if (lightFg || darkFg) el.setAttribute("data-aonwiki-authored-fg", "1");
      else el.removeAttribute("data-aonwiki-authored-fg");
    }
  });
  return await rewriter.transform(new Response(String(markup || ""), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  })).text();
}
async function renderNamuMarkupOnWorker(env, title, source, linkColors = {}) {
  const extracted = extractAdminLinkColors(source);
  const text = extracted.content;
  const colors = {};
  for (const key of ADMIN_LINK_COLOR_KEYS) {
    const color = normalizeAdminLinkColor(linkColors?.[key]);
    if (color) colors[key] = color;
  }
  const cacheKey = "targeted-db-v25-theme-text-only:" + String(title) + ":" + namuFileHash(String(source || "") + "\n" + JSON.stringify(colors));
  const cached = namuRenderCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (namuRenderPending.has(cacheKey)) return namuRenderPending.get(cacheKey);
  const pending = (async () => {
    try {
      await ensureNamuRenderCacheSchema(env);
      const stored = await env.DB.prepare("SELECT source_hash, html, metadata_json FROM namu_render_cache WHERE title = ?").bind(title).first();
      if (stored && stored.source_hash === cacheKey) {
        let metadata = {};
        try {
          metadata = JSON.parse(stored.metadata_json || "{}");
        } catch {
        }
        const value2 = { html: String(stored.html || ""), metadata };
        namuRenderCache.set(cacheKey, { value: value2, expiresAt: Date.now() + 5 * 60 * 1e3 });
        return value2;
      }
    } catch (error) {
      console.warn("AonWiki persistent render cache read failed:", error);
    }
    const database = await buildNamuServerDatabase(env, title, text);
    const parser = new NamuMark(text, { docName: title, useTocSet: "default", docType: "view" }, database);
    const parsed = parser.parse();
    const cleanHtml = await sanitizeServerWikiHtml(parsed[0] || "");
    const contrastedHtml = await applyTableTextContrast(cleanHtml);
    const value = { html: buildAdminLinkColorMarkup(contrastedHtml, colors), metadata: parsed[2] || {} };
    namuRenderCache.set(cacheKey, { value, expiresAt: Date.now() + 5 * 60 * 1e3 });
    if (namuRenderCache.size > 100) {
      const oldest = namuRenderCache.keys().next().value;
      if (oldest) namuRenderCache.delete(oldest);
    }
    if (value.html.length <= 25e4) {
      try {
        await ensureNamuRenderCacheSchema(env);
        await env.DB.prepare("INSERT INTO namu_render_cache (title, source_hash, html, metadata_json, updated_at) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(title) DO UPDATE SET source_hash = excluded.source_hash, html = excluded.html, metadata_json = excluded.metadata_json, updated_at = excluded.updated_at").bind(title, cacheKey, value.html, JSON.stringify(value.metadata || {})).run();
      } catch (error) {
        console.warn("AonWiki persistent render cache write failed:", error);
      }
    } else {
      try {
        await ensureNamuRenderCacheSchema(env);
        await env.DB.prepare("DELETE FROM namu_render_cache WHERE title = ?").bind(title).run();
      } catch {
      }
    }
    return value;
  })().finally(() => namuRenderPending.delete(cacheKey));
  namuRenderPending.set(cacheKey, pending);
  return pending;
}
async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function escapeHtml2(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
function safeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
function rewriteFrontendAssets(html, frontendOrigin) {
  const base = frontendOrigin.replace(/\/+$/, "") + "/";
  const staticAssets = /* @__PURE__ */ new Set(["style.css", "namumark-beta.css", "app.js", "aonwiki-mark.svg"]);
  return String(html).replace(/\b(href|src)\s*=\s*(["'])(.*?)\2/gi, (attribute, name, quote, rawUrl) => {
    let parsed;
    try {
      parsed = new URL(String(rawUrl).trim(), base);
    } catch {
      return attribute;
    }
    const file = parsed.pathname.split("/").filter(Boolean).pop() || "";
    if (!staticAssets.has(file)) return attribute;
    parsed.searchParams.set("aonfix", "20261107-namu-parity-v5");
    return name + "=" + quote + base + file + parsed.search + parsed.hash + quote;
  });
}
var frontendShellCache = { value: null, expiresAt: 0 };
var frontendShellPending = null;
async function loadFrontendShell(env) {
  if (frontendShellCache.value && frontendShellCache.expiresAt > Date.now()) return frontendShellCache.value;
  if (frontendShellPending) return frontendShellPending;
  frontendShellPending = (async () => {
    const origin = String(env.FRONTEND_ORIGIN || "https://hiakdhs323-cmd.github.io/aon").replace(/\/$/, "");
    const shellResponse = await fetch(origin + "/?aonwiki-shell=20261107-namu-parity-v5", { headers: { "Accept": "text/html", "Cache-Control": "no-cache" }, cf: { cacheTtl: 60, cacheEverything: true } });
    if (!shellResponse.ok) throw new Error("\uD504\uB7F0\uD2B8\uC5D4\uB4DC HTML\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: " + shellResponse.status);
    const shell = await shellResponse.text();
    if (!shell.includes('id="article"')) throw new Error("\uD504\uB7F0\uD2B8\uC5D4\uB4DC \uBB38\uC11C \uD15C\uD50C\uB9BF\uC5D0 article \uC601\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    const value = { shell: rewriteFrontendAssets(shell, origin), origin };
    frontendShellCache = { value, expiresAt: Date.now() + 30 * 1e3 };
    return value;
  })().finally(() => {
    frontendShellPending = null;
  });
  return frontendShellPending;
}
async function findWikiPage(env, title) {
  let page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(title).first();
  if (!page) {
    await ensurePageAliasSchema(env);
    const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
    if (alias) page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(alias.title).first();
  }
  return page;
}
async function renderFullWikiDocument(request, env, title) {
  const { shell, origin } = await loadFrontendShell(env);
  const page = await findWikiPage(env, title);
  const found = Boolean(page);
  const actualTitle = found ? page.title : title;
  const linkColors = found ? await getPageLinkColors(env, actualTitle) : {};
  const rendered = found ? await renderNamuMarkupOnWorker(env, actualTitle, page.content || "", linkColors) : { html: "" };
  let protection = null;
  if (found) {
    await ensurePageProtectionSchema(env);
    protection = await env.DB.prepare("SELECT level, reason, protected_by, updated_at FROM page_protections WHERE title = ?").bind(actualTitle).first();
  }
  const titleText = found ? actualTitle : actualTitle + " (\uBB38\uC11C \uC5C6\uC74C)";
  const description = found ? String(page.content || "").replace(/\s+/g, " ").slice(0, 180) : "\uC544\uC9C1 \uC791\uC131\uB418\uC9C0 \uC54A\uC740 \uBB38\uC11C\uC785\uB2C8\uB2E4.";
  const state = {
    title: actualTitle,
    content: found ? String(page.content || "") : "",
    protection: { level: protection?.level || "none", reason: protection?.reason || "" },
    exists: found
  };
  const protectionLabel = protection?.level === "admin" ? "\uAD00\uB9AC\uC790 \uD3B8\uC9D1 \uBCF4\uD638" : protection?.level === "registered" ? "\uD68C\uC6D0 \uD3B8\uC9D1 \uBCF4\uD638" : "";
  const officialTemplate = found && /^(?:틀|template):/i.test(actualTitle);
  const protectionMessage = protectionLabel ? protection?.reason || (protection.level === "admin" ? "\uC774 \uBB38\uC11C\uB294 \uAD00\uB9AC\uC790\uB9CC \uD3B8\uC9D1\uD560 \uC218 \uC788\uB3C4\uB85D \uBCF4\uD638\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4." : "\uC774 \uBB38\uC11C\uB294 \uB85C\uADF8\uC778\uD55C \uD68C\uC6D0\uB9CC \uD3B8\uC9D1\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.") : "";
  let html = shell.replace("<title>AonWiki</title>", "<title>" + escapeHtml2(titleText) + " - AonWiki</title>").replace(/<meta name="theme-color"[^>]*>/i, '<meta name="theme-color" content="#00a69c">\n<meta name="description" content="' + escapeHtml2(description) + '">\n<meta property="og:title" content="' + escapeHtml2(titleText) + ' - AonWiki">\n<meta property="og:description" content="' + escapeHtml2(description) + '">\n<link rel="canonical" href="' + escapeHtml2(new URL(request.url).origin + "/w/" + encodeURIComponent(actualTitle)) + '">').replace("<body>", '<body data-ssr-page="true">').replace('<section id="home-view" class="home-view">', '<section id="home-view" class="home-view" hidden>').replace('<section id="document-view" class="document-view" hidden>', '<section id="document-view" class="document-view">').replace('<h1 id="title"></h1>', '<h1 id="title">' + escapeHtml2(titleText) + "</h1>").replace('<span id="crumb"></span>', '<span id="crumb">' + escapeHtml2(actualTitle) + "</span>").replace('<span id="template-status" class="template-status" hidden>\uACF5\uC2DD \uD2C0 \uBB38\uC11C</span>', officialTemplate ? '<span id="template-status" class="template-status">\uACF5\uC2DD \uD2C0 \uBB38\uC11C</span>' : '<span id="template-status" class="template-status" hidden>\uACF5\uC2DD \uD2C0 \uBB38\uC11C</span>').replace('<span id="protection-status" class="protection-status" hidden></span>', protectionLabel ? '<span id="protection-status" class="protection-status">' + escapeHtml2(protectionLabel) + "</span>" : '<span id="protection-status" class="protection-status" hidden></span>').replace('<div id="protection-notice" class="protection-notice" role="status" aria-live="polite" hidden></div>', protectionMessage ? '<div id="protection-notice" class="protection-notice" role="status" aria-live="polite">' + escapeHtml2(protectionMessage) + "</div>" : '<div id="protection-notice" class="protection-notice" role="status" aria-live="polite" hidden></div>').replace('<div id="message" class="notice" role="status"></div>', '<div id="message" class="notice" role="status">' + (found ? "" : "\uC774 \uBB38\uC11C\uB294 \uC544\uC9C1 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uB85C\uADF8\uC778 \uD6C4 \uC0C8 \uBB38\uC11C\uB97C \uC791\uC131\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.") + "</div>").replace('<article id="article" class="wiki-content"></article>', '<article id="article" class="wiki-content">' + rendered.html + "</article>").replace('id="edit" class="nav-item" type="button" hidden', protection?.level === "admin" ? 'id="edit" class="nav-item" type="button" hidden' : 'id="edit" class="nav-item" type="button"').replace('id="history" class="nav-item" type="button" hidden', 'id="history" class="nav-item" type="button"' + (found ? "" : " hidden")).replace('id="upload" class="nav-item" type="button" hidden', 'id="upload" class="nav-item" type="button"' + (found ? "" : " hidden")).replace('id="backlinks-tab" type="button" hidden', 'id="backlinks-tab" type="button"' + (found ? "" : " hidden"));
  if (!found) {
    html = html.replace('id="heading-edit" class="title-button" type="button"', 'id="heading-edit" class="title-button" type="button" hidden');
    html = html.replace('<button id="edit" class="nav-item" type="button">\uBB38\uC11C \uD3B8\uC9D1</button>', '<button id="edit" class="nav-item" type="button">\uBB38\uC11C \uB9CC\uB4E4\uAE30</button>');
  }
  html = html.replace('<script defer src="' + origin + "/app.js", "<script>window.__AONWIKI_SSR__=" + safeJsonForHtml(state) + ';<\/script>\n<script defer src="' + origin + "/app.js");
  return new Response(html, {
    status: found ? 200 : 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-AonWiki-Render": "full-document" }
  });
}
async function passwordHash(password, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 1e5, hash: "SHA-256" }, material, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = getCors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > 2 * 1024 * 1024) return response({ error: "\uC694\uCCAD \uBCF8\uBB38\uC740 2MB \uC774\uD558\uB9CC \uD5C8\uC6A9\uB429\uB2C8\uB2E4." }, 413, cors);
    try {
      if (request.method === "GET" && url.pathname.startsWith("/w/")) {
        let title = "";
        try {
          title = decodeURIComponent(url.pathname.slice(3));
        } catch {
          return new Response("\uC798\uBABB\uB41C \uBB38\uC11C \uC8FC\uC18C\uC785\uB2C8\uB2E4.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
        title = cleanTitle(title);
        if (!title) return new Response("\uC798\uBABB\uB41C \uBB38\uC11C \uC8FC\uC18C\uC785\uB2C8\uB2E4.", { status: 400 });
        return await renderFullWikiDocument(request, env, title);
      }
      if (request.method === "GET" && url.pathname.toLowerCase() === "/search") {
        const { shell } = await loadFrontendShell(env);
        return new Response(shell, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-AonWiki-Render": "search-shell"
          }
        });
      }
      if (request.method === "GET" && url.pathname === "/") {
        const { shell } = await loadFrontendShell(env);
        return new Response(shell, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-AonWiki-Render": "home-shell"
          }
        });
      }
      if (url.pathname === "/api/logout" && request.method === "POST") {
        const authorization = request.headers.get("Authorization") || "";
        if (authorization.startsWith("Bearer ")) {
          await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(authorization.slice(7))).run();
        }
        return response({ ok: true }, 200, cors);
      }
      if (url.pathname === "/api/me" && request.method === "GET") {
        const user = await currentUser(request, env);
        return response({ authenticated: Boolean(user), username: user?.username || null, role: user?.role || "anonymous", isAdmin: Boolean(user?.isAdmin) }, 200, cors);
      }
      if (url.pathname === "/api/admin/bootstrap-account" && request.method === "POST") {
        if (!env.ADMIN_BOOTSTRAP_SECRET || env.ADMIN_BOOTSTRAP_SECRET.length < 32) return response({ error: "\uAD00\uB9AC\uC790 \uCD08\uAE30 \uC124\uC815\uC774 \uC11C\uBC84\uC5D0\uC11C \uD65C\uC131\uD654\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." }, 503, cors);
        if (await authRateLimited(request, env, "admin-bootstrap", 5, 60 * 60 * 1e3)) return response({ error: "\uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uB098\uC911\uC5D0 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        const supplied = request.headers.get("X-Admin-Bootstrap-Secret") || "";
        if (!constantTimeEqual(supplied, env.ADMIN_BOOTSTRAP_SECRET)) return response({ error: "\uC778\uC99D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4." }, 403, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS wiki_admins (user_id TEXT PRIMARY KEY NOT NULL, granted_at TEXT NOT NULL, granted_by TEXT NOT NULL)").run();
        const alreadyGranted = await env.DB.prepare("SELECT user_id FROM wiki_admins LIMIT 1").first();
        if (alreadyGranted) return response({ error: "\uCD5C\uCD08 \uAD00\uB9AC\uC790 \uB4F1\uB85D\uC740 \uC774\uBBF8 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4." }, 409, cors);
        const body = await request.json();
        const username = String(body.username || "").trim();
        if (username.toLocaleLowerCase() !== "\uC544\uC628") return response({ error: "\uCD5C\uCD08 \uAD00\uB9AC\uC790 \uB4F1\uB85D \uB300\uC0C1\uC740 \uC544\uC628 \uACC4\uC815\uC73C\uB85C \uC81C\uD55C\uB429\uB2C8\uB2E4." }, 403, cors);
        const target = await env.DB.prepare("SELECT id, username FROM users WHERE username = ? COLLATE NOCASE").bind("\uC544\uC628").first();
        if (!target) return response({ error: "\uD574\uB2F9 \uACC4\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uBA3C\uC800 \uACC4\uC815\uC744 \uB9CC\uB4E0 \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 404, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const result = await env.DB.prepare("INSERT INTO wiki_admins (user_id, granted_at, granted_by) SELECT ?, ?, 'one-time-bootstrap' WHERE NOT EXISTS (SELECT 1 FROM wiki_admins)").bind(target.id, now).run();
        if (!result.success || Number(result.meta?.changes || 0) !== 1) return response({ error: "\uCD5C\uCD08 \uAD00\uB9AC\uC790 \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC774\uBBF8 \uB4F1\uB85D\uB418\uC5C8\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 409, cors);
        return response({ ok: true, username: target.username, role: "admin", message: "\uCD5C\uCD08 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uCD08\uAE30 \uC124\uC815 \uBE44\uBC00\uAC12\uC740 \uC989\uC2DC \uD3D0\uAE30\uD558\uC138\uC694." }, 200, cors);
      }
      if (url.pathname === "/api/admin/token/rotate" && request.method === "POST") {
        const adminUser = await currentUser(request, env);
        if (!adminUser || !adminUser.isAdmin) return response({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        const token = makeAdminToken();
        await ensureAdminTokenTable(env);
        await env.DB.prepare("INSERT INTO admin_tokens (id, token_hash, updated_at) VALUES ('primary', ?, ?) ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash, updated_at = excluded.updated_at").bind(await sha256(token), (/* @__PURE__ */ new Date()).toISOString()).run();
        return response({ ok: true, token, message: "\uC0C8 \uAD00\uB9AC\uC790 \uD1A0\uD070\uC774 \uBC1C\uAE09\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC774 \uAC12\uC740 \uB2E4\uC2DC \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 200, cors);
      }
      if (url.pathname === "/api/home" && request.method === "GET") {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS wiki_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL, editor TEXT NOT NULL DEFAULT '')").run();
        const result = await env.DB.prepare("SELECT key, value FROM wiki_settings WHERE key IN ('home_title','home_tagline','home_notice','home_content','home_search_hint','home_list_title','home_bottom_title','home_bottom_text')").all();
        const settings = Object.fromEntries((result.results || []).map((row) => [row.key, row.value]));
        return response({ settings: {
          title: settings.home_title || "AonWiki",
          tagline: settings.home_tagline || "\uD568\uAED8 \uB9CC\uB4DC\uB294 \uC9C0\uC2DD \uBC31\uACFC\uC0AC\uC804",
          notice: settings.home_notice || "",
          content: settings.home_content || "",
          searchHint: settings.home_search_hint || "\uAC80\uC0C9\uCC3D\uC5D0\uC11C \uBB38\uC11C\uB97C \uCC3E\uAC70\uB098 \uC544\uB798 \uBAA9\uB85D\uC5D0\uC11C \uC6D0\uD558\uB294 \uBB38\uC11C\uB97C \uC120\uD0DD\uD558\uC138\uC694.",
          listTitle: settings.home_list_title || "\uCD5C\uADFC \uC218\uC815\uB41C \uBB38\uC11C",
          bottomTitle: settings.home_bottom_title || "\uBB38\uC11C\uAC00 \uC5C6\uB098\uC694?",
          bottomText: settings.home_bottom_text || "\uB85C\uADF8\uC778\uD55C \uB4A4 \uC0C8 \uBB38\uC11C\uB97C \uB9CC\uB4E4\uC5B4 \uC9C0\uC2DD\uC744 \uACF5\uC720\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
        } }, 200, cors);
      }
      if (url.pathname === "/api/home" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "\uB300\uBB38\uC744 \uC218\uC815\uD558\uB824\uBA74 \uC704\uD0A4 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        const body = await request.json();
        const settings = {
          home_title: String(body.title || "AonWiki").trim().slice(0, 80),
          home_tagline: String(body.tagline || "").trim().slice(0, 200),
          home_notice: String(body.notice || "").trim().slice(0, 2e3),
          home_content: String(body.content || "").slice(0, 2e5),
          home_search_hint: String(body.searchHint || "").trim().slice(0, 300),
          home_list_title: String(body.listTitle || "").trim().slice(0, 80),
          home_bottom_title: String(body.bottomTitle || "").trim().slice(0, 80),
          home_bottom_text: String(body.bottomText || "").trim().slice(0, 500)
        };
        const now = (/* @__PURE__ */ new Date()).toISOString();
        for (const [key, value] of Object.entries(settings)) {
          await env.DB.prepare("INSERT INTO wiki_settings (key, value, updated_at, editor) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, editor = excluded.editor").bind(key, value, now, user.username).run();
        }
        return response({ ok: true, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/page/protection" && request.method === "PUT") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "\uD3B8\uC9D1 \uBCF4\uD638\uB97C \uC124\uC815\uD558\uB824\uBA74 \uC704\uD0A4 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        const body = await request.json();
        const title = cleanTitle(body.title);
        const level = String(body.level || "none");
        const reason = String(body.reason || "").trim().slice(0, 300);
        if (!title || title === "\uB300\uBB38") return response({ error: "\uBCF4\uD638\uD560 \uC218 \uC5C6\uB294 \uBB38\uC11C\uC785\uB2C8\uB2E4." }, 400, cors);
        if (!["none", "registered", "admin"].includes(level)) return response({ error: "\uC62C\uBC14\uB978 \uBCF4\uD638 \uC218\uC900\uC744 \uC120\uD0DD\uD558\uC138\uC694." }, 400, cors);
        const page = await env.DB.prepare("SELECT title FROM pages WHERE title = ?").bind(title).first();
        if (!page) return response({ error: "\uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        await ensurePageProtectionSchema(env);
        if (level === "none") {
          await env.DB.prepare("DELETE FROM page_protections WHERE title = ?").bind(title).run();
          return response({ ok: true, title, protection: { level: "none", reason: "", protectedBy: user.username } }, 200, cors);
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("INSERT INTO page_protections (title, level, reason, protected_by, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(title) DO UPDATE SET level = excluded.level, reason = excluded.reason, protected_by = excluded.protected_by, updated_at = excluded.updated_at").bind(title, level, reason, user.username, now).run();
        return response({ ok: true, title, protection: { level, reason, protectedBy: user.username, updatedAt: now } }, 200, cors);
      }
      if (url.pathname === "/api/page" && request.method === "DELETE") {
        const user = await currentUser(request, env);
        if (!user?.isAdmin) return response({ error: "\uBB38\uC11C\uB97C \uC0AD\uC81C\uD558\uB824\uBA74 \uC704\uD0A4 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 403, cors);
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title || title === "\uB300\uBB38") return response({ error: "\uC0AD\uC81C\uD560 \uC218 \uC5C6\uB294 \uBB38\uC11C\uC785\uB2C8\uB2E4." }, 400, cors);
        await env.DB.prepare("DELETE FROM pages WHERE title = ?").bind(title).run();
        await ensurePageLinkColorsSchema(env);
        await env.DB.prepare("DELETE FROM page_link_colors WHERE title = ?").bind(title).run();
        invalidateNamuServerIndexes();
        await clearPersistentNamuRenderCache(env);
        await env.DB.prepare("DELETE FROM revisions WHERE title = ?").bind(title).run();
        return response({ ok: true, title }, 200, cors);
      }
      if (url.pathname === "/api/health" && request.method === "GET") {
        return response({ ok: true, service: "AonWiki API" }, 200, cors);
      }
      if (url.pathname === "/api/account/password" && request.method === "POST") {
        const authorization = request.headers.get("Authorization") || "";
        if (!authorization.startsWith("Bearer ")) return response({ error: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 401, cors);
        const sessionTokenHash = await sha256(authorization.slice(7));
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const user = await env.DB.prepare(
          "SELECT users.id, users.username, users.salt, users.password_hash FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?"
        ).bind(sessionTokenHash, now).first();
        if (!user) return response({ error: "\uC77C\uBC18 \uACC4\uC815\uC73C\uB85C \uB85C\uADF8\uC778\uD55C \uB4A4 \uBE44\uBC00\uBC88\uD638\uB97C \uBCC0\uACBD\uD558\uC138\uC694." }, 401, cors);
        const body = await request.json();
        const currentPassword = String(body.currentPassword || "");
        const newPassword = String(body.newPassword || "");
        if (newPassword.length < 8 || newPassword.length > 200) {
          return response({ error: "\uC0C8 \uBE44\uBC00\uBC88\uD638\uB294 8~200\uC790\uB85C \uC124\uC815\uD558\uC138\uC694." }, 400, cors);
        }
        const currentHash = await passwordHash(currentPassword, user.salt);
        if (!constantTimeEqual(currentHash, user.password_hash)) {
          return response({ error: "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 403, cors);
        }
        if (constantTimeEqual(await passwordHash(newPassword, user.salt), user.password_hash)) {
          return response({ error: "\uD604\uC7AC\uC640 \uB2E4\uB978 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        }
        const newSalt = crypto.randomUUID();
        const newHash = await passwordHash(newPassword, newSalt);
        await env.DB.prepare("UPDATE users SET salt = ?, password_hash = ? WHERE id = ?").bind(newSalt, newHash, user.id).run();
        await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
        const token = [...crypto.getRandomValues(new Uint8Array(32))].map((byte) => byte.toString(16).padStart(2, "0")).join("");
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
        await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), user.id, expires).run();
        return response({
          ok: true,
          token,
          username: user.username,
          expires_at: expires,
          message: "\uBE44\uBC00\uBC88\uD638\uAC00 \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uB978 \uAE30\uAE30\uC758 \uB85C\uADF8\uC778\uC740 \uBAA8\uB450 \uD574\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4."
        }, 200, cors);
      }
      if (url.pathname === "/api/register" && request.method === "POST") {
        if (await authRateLimited(request, env, "register", 5, 60 * 60 * 1e3)) return response({ error: "\uAC00\uC785 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uD55C \uC2DC\uAC04 \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL)").run();
        const body = await request.json();
        const username = String(body.username || "").trim();
        const password = String(body.password || "");
        if (!/^[A-Za-z0-9가-힣_-]{2,20}$/.test(username)) return response({ error: "\uC544\uC774\uB514\uB294 \uD55C\uAE00/\uC601\uBB38/\uC22B\uC790/_/- 2~20\uC790\uB85C \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        if (password.length < 8 || password.length > 200) return response({ error: "\uBE44\uBC00\uBC88\uD638\uB294 8~200\uC790\uB85C \uC124\uC815\uD558\uC138\uC694." }, 400, cors);
        const exists = await env.DB.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
        if (exists) return response({ error: "\uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC778 \uC544\uC774\uB514\uC785\uB2C8\uB2E4." }, 409, cors);
        const id = crypto.randomUUID(), salt = crypto.randomUUID(), now = (/* @__PURE__ */ new Date()).toISOString();
        const hash = await passwordHash(password, salt);
        await env.DB.prepare("INSERT INTO users (id,username,salt,password_hash,created_at) VALUES (?,?,?,?,?)").bind(id, username, salt, hash, now).run();
        return response({ ok: true, message: "\uAC00\uC785 \uC644\uB8CC! \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694." }, 201, cors);
      }
      if (url.pathname === "/api/login" && request.method === "POST") {
        if (await authRateLimited(request, env, "login", 20, 15 * 60 * 1e3)) return response({ error: "\uB85C\uADF8\uC778 \uC2DC\uB3C4\uAC00 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. 15\uBD84 \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL)").run();
        const body = await request.json();
        const username = String(body.username || "").trim();
        const password = String(body.password || "");
        const user = await env.DB.prepare("SELECT id,username,salt,password_hash FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
        if (!user || await passwordHash(password, user.salt) !== user.password_hash) return response({ error: "\uC544\uC774\uB514 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 401, cors);
        const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString();
        await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await sha256(token), user.id, expires).run();
        return response({ ok: true, token, username: user.username, expires_at: expires }, 200, cors);
      }
      if (url.pathname === "/api/discussions" && request.method === "GET") {
        await ensureDiscussionSchema(env);
        const pageTitle = cleanTitle(url.searchParams.get("title"));
        const query = String(url.searchParams.get("q") || "").normalize("NFC").trim().slice(0, 80);
        const requestedStatus = String(url.searchParams.get("status") || "all");
        const status = requestedStatus === "open" || requestedStatus === "closed" ? requestedStatus : "all";
        const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20", 10) || 20));
        const offset = Math.min(1e5, Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0));
        const conditions = ["deleted_at = ''"];
        const values = [];
        if (pageTitle) {
          conditions.push("page_title = ?");
          values.push(pageTitle);
        }
        if (status !== "all") {
          conditions.push("status = ?");
          values.push(status);
        }
        if (query) {
          const terms = [...new Set(query.split(/\\s+/).filter(Boolean))].slice(0, 6);
          for (const term of terms) {
            const pattern = "%" + term.replace(/[\\\\%_]/g, "") + "%";
            conditions.push("(title LIKE ? OR body LIKE ?)");
            values.push(pattern, pattern);
          }
        }
        const where = conditions.join(" AND ");
        const [items, count] = await Promise.all([
          env.DB.prepare("SELECT id, page_title, title, author, created_at, updated_at, last_post_at, reply_count, status FROM discussions WHERE " + where + " ORDER BY last_post_at DESC, id DESC LIMIT ? OFFSET ?").bind(...values, limit, offset).all(),
          env.DB.prepare("SELECT COUNT(*) AS total FROM discussions WHERE " + where).bind(...values).first()
        ]);
        return response({ discussions: items.results || [], total: Number(count?.total || 0), limit, offset, pageTitle, query, status }, 200, cors);
      }
      if (url.pathname === "/api/discussion" && request.method === "GET") {
        await ensureDiscussionSchema(env);
        const id = Number(url.searchParams.get("id"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "\uC62C\uBC14\uB978 \uD1A0\uB860 \uBC88\uD638\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, page_title, title, body, author, created_at, updated_at, last_post_at, reply_count, status FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "\uD1A0\uB860\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        const posts = await env.DB.prepare("SELECT id, discussion_id, body, author, created_at, edited_at, is_deleted FROM discussion_posts WHERE discussion_id = ? ORDER BY id ASC LIMIT 500").bind(id).all();
        return response({ discussion, posts: posts.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/discussions" && request.method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uD1A0\uB860\uC744 \uC2DC\uC791\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        if (await authRateLimited(request, env, "discussion-create", 5, 10 * 60 * 1e3)) return response({ error: "\uD1A0\uB860 \uC0DD\uC131 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await ensureDiscussionSchema(env);
        const body = await request.json();
        const title = String(body.title || "").trim().replace(/[\x00-\x1f\x7f]/g, "").slice(0, 120);
        const content = String(body.body || "").trim().slice(0, 1e4);
        const pageTitle = cleanTitle(body.pageTitle || "");
        if (title.length < 2) return response({ error: "\uD1A0\uB860 \uC81C\uBAA9\uC740 2\uC790 \uC774\uC0C1 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        if (!content) return response({ error: "\uD1A0\uB860 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        if (pageTitle) {
          const page = await env.DB.prepare("SELECT title FROM pages WHERE title = ?").bind(pageTitle).first();
          if (!page) return response({ error: "\uC5F0\uACB0\uD560 \uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const result = await env.DB.prepare("INSERT INTO discussions (page_title, title, body, author, created_at, updated_at, last_post_at, reply_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'open')").bind(pageTitle, title, content, user.username, now, now, now).run();
        return response({ ok: true, id: Number(result.meta?.last_row_id || 0), created_at: now }, 201, cors);
      }
      if (url.pathname === "/api/discussion/reply" && request.method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uB2F5\uAE00\uC744 \uC791\uC131\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        if (await authRateLimited(request, env, "discussion-reply", 15, 5 * 60 * 1e3)) return response({ error: "\uB2F5\uAE00 \uC791\uC131 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        await ensureDiscussionSchema(env);
        const body = await request.json();
        const id = Number(body.id);
        const content = String(body.body || "").trim().slice(0, 6e3);
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "\uC62C\uBC14\uB978 \uD1A0\uB860 \uBC88\uD638\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        if (!content) return response({ error: "\uB2F5\uAE00 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, status FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "\uD1A0\uB860\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (discussion.status !== "open") return response({ error: "\uC885\uB8CC\uB41C \uD1A0\uB860\uC5D0\uB294 \uB2F5\uAE00\uC744 \uC791\uC131\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 409, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const result = await env.DB.prepare("INSERT INTO discussion_posts (discussion_id, body, author, created_at) VALUES (?, ?, ?, ?)").bind(id, content, user.username, now).run();
        await env.DB.prepare("UPDATE discussions SET reply_count = reply_count + 1, updated_at = ?, last_post_at = ? WHERE id = ?").bind(now, now, id).run();
        return response({ ok: true, id: Number(result.meta?.last_row_id || 0), created_at: now }, 201, cors);
      }
      if (url.pathname === "/api/discussion" && request.method === "PATCH") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uD1A0\uB860 \uC0C1\uD0DC\uB97C \uBCC0\uACBD\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        await ensureDiscussionSchema(env);
        const body = await request.json();
        const id = Number(body.id);
        const action = String(body.action || "");
        if (!Number.isSafeInteger(id) || id < 1 || !["close", "reopen", "edit"].includes(action)) return response({ error: "\uC62C\uBC14\uB978 \uD1A0\uB860 \uBCC0\uACBD \uC694\uCCAD\uC774 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, author, status FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "\uD1A0\uB860\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (!user.isAdmin && discussion.author !== user.username) return response({ error: "\uD1A0\uB860 \uC791\uC131\uC790 \uB610\uB294 \uC704\uD0A4 \uAD00\uB9AC\uC790\uB9CC \uBCC0\uACBD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (action === "edit") {
          const title = String(body.title || "").trim().replace(/[\x00-\x1f\x7f]/g, "").slice(0, 120);
          const content = String(body.body || "").trim().slice(0, 1e4);
          if (title.length < 2) return response({ error: "\uD1A0\uB860 \uC81C\uBAA9\uC740 2\uC790 \uC774\uC0C1 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
          if (!content) return response({ error: "\uD1A0\uB860 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
          if (!user.isAdmin && discussion.status !== "open") return response({ error: "\uC885\uB8CC\uB41C \uD1A0\uB860\uC740 \uAD00\uB9AC\uC790\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
          await env.DB.prepare("UPDATE discussions SET title = ?, body = ?, updated_at = ? WHERE id = ?").bind(title, content, now, id).run();
          return response({ ok: true, id, title, updated_at: now }, 200, cors);
        }
        const status = action === "close" ? "closed" : "open";
        await env.DB.prepare("UPDATE discussions SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, id).run();
        return response({ ok: true, id, status }, 200, cors);
      }
      if (url.pathname === "/api/discussion/post" && request.method === "PATCH") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uB2F5\uAE00\uC744 \uC218\uC815\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        await ensureDiscussionSchema(env);
        const body = await request.json();
        const id = Number(body.id);
        const content = String(body.body || "").trim().slice(0, 6e3);
        if (!Number.isSafeInteger(id) || id < 1 || !content) return response({ error: "\uC62C\uBC14\uB978 \uB2F5\uAE00 \uC218\uC815 \uC694\uCCAD\uC774 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        const post = await env.DB.prepare("SELECT id, discussion_id, author, created_at, is_deleted FROM discussion_posts WHERE id = ?").bind(id).first();
        if (!post || Number(post.is_deleted)) return response({ error: "\uC218\uC815\uD560 \uB2F5\uAE00\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (!user.isAdmin && post.author !== user.username) return response({ error: "\uBCF8\uC778\uC774 \uC791\uC131\uD55C \uB2F5\uAE00\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        const age = Date.now() - Date.parse(post.created_at);
        if (!user.isAdmin && (age < 0 || age > 30 * 60 * 1e3)) return response({ error: "\uC77C\uBC18 \uD68C\uC6D0\uC740 \uC791\uC131 \uD6C4 30\uBD84 \uC774\uB0B4\uC758 \uB2F5\uAE00\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("UPDATE discussion_posts SET body = ?, edited_at = ? WHERE id = ?").bind(content, now, id).run();
        await env.DB.prepare("UPDATE discussions SET updated_at = ? WHERE id = ?").bind(now, post.discussion_id).run();
        return response({ ok: true, id, edited_at: now }, 200, cors);
      }
      if (url.pathname === "/api/discussion/post" && request.method === "DELETE") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uB2F5\uAE00\uC744 \uC0AD\uC81C\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        await ensureDiscussionSchema(env);
        const id = Number(url.searchParams.get("id"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "\uC62C\uBC14\uB978 \uB2F5\uAE00 \uBC88\uD638\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        const post = await env.DB.prepare("SELECT id, discussion_id, author, is_deleted FROM discussion_posts WHERE id = ?").bind(id).first();
        if (!post || Number(post.is_deleted)) return response({ error: "\uC0AD\uC81C\uD560 \uB2F5\uAE00\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (!user.isAdmin && post.author !== user.username) return response({ error: "\uBCF8\uC778\uC774 \uC791\uC131\uD55C \uB2F5\uAE00\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("UPDATE discussion_posts SET body = '', is_deleted = 1, edited_at = ? WHERE id = ?").bind(now, id).run();
        await env.DB.prepare("UPDATE discussions SET reply_count = MAX(0, reply_count - 1), updated_at = ?, last_post_at = COALESCE((SELECT MAX(created_at) FROM discussion_posts WHERE discussion_id = ? AND is_deleted = 0), created_at) WHERE id = ?").bind(now, post.discussion_id, post.discussion_id).run();
        return response({ ok: true, id }, 200, cors);
      }
      if (url.pathname === "/api/discussions" && request.method === "DELETE") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uD1A0\uB860\uC744 \uC0AD\uC81C\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        await ensureDiscussionSchema(env);
        const id = Number(url.searchParams.get("id"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "\uC62C\uBC14\uB978 \uD1A0\uB860 \uBC88\uD638\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        const discussion = await env.DB.prepare("SELECT id, author, reply_count FROM discussions WHERE id = ? AND deleted_at = ''").bind(id).first();
        if (!discussion) return response({ error: "\uD1A0\uB860\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (!user.isAdmin && discussion.author !== user.username) return response({ error: "\uD1A0\uB860 \uC791\uC131\uC790 \uB610\uB294 \uC704\uD0A4 \uAD00\uB9AC\uC790\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        if (!user.isAdmin && Number(discussion.reply_count) > 0) return response({ error: "\uB2F5\uAE00\uC774 \uC788\uB294 \uD1A0\uB860\uC740 \uAD00\uB9AC\uC790\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uD1A0\uB860\uC744 \uC885\uB8CC\uD574 \uC8FC\uC138\uC694." }, 403, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("UPDATE discussions SET deleted_at = ?, deleted_by = ?, status = 'closed', updated_at = ? WHERE id = ?").bind(now, user.username, now, id).run();
        return response({ ok: true, id }, 200, cors);
      }
      if (url.pathname === "/api/special-pages" && request.method === "GET") {
        const type = String(url.searchParams.get("type") || "").trim();
        const supported = /* @__PURE__ */ new Set(["missing", "orphan", "orphan-categories", "uncategorized", "old", "short", "long", "blocked"]);
        if (!supported.has(type)) return response({ error: "\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uD2B9\uC218 \uBB38\uC11C\uC785\uB2C8\uB2E4." }, 400, cors);
        if (type === "blocked") return response({ type, available: false, items: [], total: 0, message: "\uD604\uC7AC AonWiki\uC5D0\uB294 \uD68C\uC6D0 \uCC28\uB2E8 \uC774\uB825\uC744 \uAE30\uB85D\uD558\uB294 \uAE30\uB2A5\uC774 \uC5F0\uACB0\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 200, cors);
        const result = await env.DB.prepare("SELECT title, content, updated_at FROM pages ORDER BY title COLLATE NOCASE LIMIT 10000").all();
        const pages = (result.results || []).map((page) => ({
          title: String(page.title || ""),
          content: String(page.content || ""),
          updated_at: String(page.updated_at || "")
        }));
        const pageByKey = new Map(pages.map((page) => [page.title.toLocaleLowerCase(), page]));
        const inbound = /* @__PURE__ */ new Map();
        const missing = /* @__PURE__ */ new Map();
        const categoryReferences = /* @__PURE__ */ new Set();
        const categoryPattern = /\[\[(?:분류|category):([^\]|#]+)(?:\|[^\]]*)?\]\]/gi;
        for (const page of pages) {
          for (const match of page.content.matchAll(/\[\[([^\]]+)\]\]/g)) {
            const target = String(match[1] || "").split("|")[0].split("#")[0].trim();
            if (!target) continue;
            const key = target.toLocaleLowerCase();
            inbound.set(key, (inbound.get(key) || 0) + 1);
            if (/^(?:분류|category):/i.test(target)) {
              const category = target.replace(/^(?:분류|category):/i, "").trim().toLocaleLowerCase();
              if (category) categoryReferences.add(category);
            } else if (!pageByKey.has(key) && !/^(?:파일|file):/i.test(target) && target !== page.title) {
              const item = missing.get(key) || { title: target, count: 0, source: page.title };
              item.count++;
              missing.set(key, item);
            }
          }
          for (const match of page.content.matchAll(categoryPattern)) {
            const category = String(match[1] || "").trim().toLocaleLowerCase();
            if (category) categoryReferences.add(category);
          }
        }
        const regular = pages.filter((page) => page.title !== "\uB300\uBB38" && !/^(?:분류|category):/i.test(page.title));
        let items = [];
        let description = "";
        if (type === "missing") {
          description = "\uB2E4\uB978 \uBB38\uC11C\uC5D0\uC11C \uB9C1\uD06C\uD558\uACE0 \uC788\uC9C0\uB9CC \uC544\uC9C1 \uC791\uC131\uB418\uC9C0 \uC54A\uC740 \uBB38\uC11C\uC785\uB2C8\uB2E4.";
          items = [...missing.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "ko"));
        } else if (type === "orphan") {
          description = "\uB2E4\uB978 \uBB38\uC11C\uC5D0\uC11C \uB0B4\uBD80 \uB9C1\uD06C\uB85C \uCC38\uC870\uB418\uC9C0 \uC54A\uB294 \uBB38\uC11C\uC785\uB2C8\uB2E4.";
          items = regular.filter((page) => !inbound.has(page.title.toLocaleLowerCase())).map((page) => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "orphan-categories") {
          description = "\uC5B4\uB5A4 \uBB38\uC11C\uC5D0\uC11C\uB3C4 \uBD84\uB958 \uB9C1\uD06C\uB85C \uCC38\uC870\uD558\uC9C0 \uC54A\uB294 \uBD84\uB958\uC785\uB2C8\uB2E4.";
          items = pages.filter((page) => /^(?:분류|category):/i.test(page.title)).filter((page) => {
            const name = page.title.replace(/^(?:분류|category):/i, "").toLocaleLowerCase();
            return !categoryReferences.has(name);
          }).map((page) => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "uncategorized") {
          description = "\uBD84\uB958 \uB9C1\uD06C\uAC00 \uD558\uB098\uB3C4 \uB4F1\uB85D\uB418\uC9C0 \uC54A\uC740 \uBB38\uC11C\uC785\uB2C8\uB2E4.";
          items = regular.filter((page) => !/\[\[(?:분류|category):/i.test(page.content)).map((page) => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "old") {
          description = "\uCD5C\uADFC \uC218\uC815 \uC2DC\uAC01\uC774 \uC624\uB798\uB41C \uBB38\uC11C\uBD80\uD130 \uD45C\uC2DC\uD569\uB2C8\uB2E4.";
          items = [...regular].sort((a, b) => (Date.parse(a.updated_at) || 0) - (Date.parse(b.updated_at) || 0)).map((page) => ({ title: page.title, updated_at: page.updated_at }));
        } else if (type === "short") {
          description = "\uBCF8\uBB38 \uC6D0\uBB38\uC774 200\uC790 \uC774\uD558\uC778 \uBB38\uC11C\uC785\uB2C8\uB2E4. \uB098\uBB34\uB9C8\uD06C \uAE30\uD638\uC640 \uACF5\uBC31\uB3C4 \uAE00\uC790 \uC218\uC5D0 \uD3EC\uD568\uB429\uB2C8\uB2E4.";
          items = regular.filter((page) => page.content.trim().length <= 200).map((page) => ({ title: page.title, characters: page.content.length, updated_at: page.updated_at })).sort((a, b) => a.characters - b.characters);
        } else if (type === "long") {
          description = "\uBCF8\uBB38 \uC6D0\uBB38\uC774 10,000\uC790 \uC774\uC0C1\uC778 \uBB38\uC11C\uC785\uB2C8\uB2E4. \uB098\uBB34\uB9C8\uD06C \uAE30\uD638\uC640 \uACF5\uBC31\uB3C4 \uAE00\uC790 \uC218\uC5D0 \uD3EC\uD568\uB429\uB2C8\uB2E4.";
          items = regular.filter((page) => page.content.length >= 1e4).map((page) => ({ title: page.title, characters: page.content.length, updated_at: page.updated_at })).sort((a, b) => b.characters - a.characters);
        }
        const total = items.length;
        return response({ type, available: true, description, total, items: items.slice(0, 500) }, 200, cors);
      }
      if (url.pathname === "/api/page-index" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT title FROM pages ORDER BY title COLLATE NOCASE LIMIT 10000").all();
        return response({ pages: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/pages" && request.method === "GET") {
        const q = String(url.searchParams.get("q") || "").normalize("NFC").trim().slice(0, 100);
        const requestedScope = url.searchParams.get("scope");
        const scope = requestedScope === "title" || requestedScope === "files" ? requestedScope : "all";
        const createdAfter = String(url.searchParams.get("created_after") || "").slice(0, 40);
        const limit = Math.min(50, Math.max(5, Number.parseInt(url.searchParams.get("limit") || "25", 10) || 25));
        const pageOffset = Math.min(1e5, Math.max(0, Number.parseInt(url.searchParams.get("page_offset") || "0", 10) || 0));
        const fileOffset = Math.min(1e5, Math.max(0, Number.parseInt(url.searchParams.get("file_offset") || "0", 10) || 0));
        let result;
        if (q) {
          const terms = [...new Set(q.split(/\s+/).map((value) => value.trim()).filter(Boolean))].slice(0, 6);
          const escapeLike = (value) => String(value).replace(/[!%_]/g, (character) => "!" + character);
          const patterns = terms.map((term) => "%" + escapeLike(term) + "%");
          const phrasePattern = "%" + escapeLike(q) + "%";
          const prefixPattern = escapeLike(terms[0] || q) + "%";
          const shouldSearchPages = scope !== "files";
          const shouldSearchFiles = scope !== "title";
          const pageCondition = terms.map(
            () => scope === "title" ? "title LIKE ? ESCAPE '!'" : "(title LIKE ? ESCAPE '!' OR content LIKE ? ESCAPE '!')"
          ).join(" AND ");
          const pageParameters = terms.flatMap((term, index) => {
            const pattern = patterns[index];
            return scope === "title" ? [pattern] : [pattern, pattern];
          });
          const fileCondition = terms.map(
            () => "(filename LIKE ? ESCAPE '!' OR EXISTS (SELECT 1 FROM image_aliases WHERE image_aliases.image_id = images.id AND image_aliases.alias LIKE ? ESCAPE '!'))"
          ).join(" AND ");
          const fileParameters = terms.flatMap((term, index) => [patterns[index], patterns[index]]);
          const makeSnippet = (source) => {
            let plain = String(source || "").replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\[https?:\/\/\S+\s+([^\]]+)\]/gi, "$1").replace(/<[^>]*>/g, " ").replace(/'{2,5}/g, "").replace(/^\s*=+.*?=+\s*$/gm, " ").replace(/[|{}\[\]#]/g, " ").replace(/\s+/g, " ").trim();
            if (!plain) return "";
            const lower = plain.toLocaleLowerCase("ko-KR");
            const positions = terms.map((term) => lower.indexOf(term.toLocaleLowerCase("ko-KR"))).filter((index) => index >= 0);
            const matchAt = positions.length ? Math.min(...positions) : 0;
            const start = Math.max(0, matchAt - 78);
            const end = Math.min(plain.length, start + 230);
            return (start > 0 ? "\u2026" : "") + plain.slice(start, end) + (end < plain.length ? "\u2026" : "");
          };
          let pageTotal = 0;
          let pages = [];
          if (shouldSearchPages) {
            const [count, rows] = await Promise.all([
              env.DB.prepare("SELECT COUNT(*) AS total FROM pages WHERE " + pageCondition).bind(...pageParameters).first(),
              env.DB.prepare(
                "SELECT title, content, created_at, updated_at FROM pages WHERE " + pageCondition + " ORDER BY CASE WHEN lower(title) = lower(?) THEN 0 WHEN lower(title) LIKE lower(?) ESCAPE '!' THEN 1 WHEN lower(title) LIKE lower(?) ESCAPE '!' THEN 2 ELSE 3 END, updated_at DESC, title COLLATE NOCASE ASC LIMIT ? OFFSET ?"
              ).bind(...pageParameters, q, prefixPattern, phrasePattern, limit, pageOffset).all()
            ]);
            pageTotal = Number(count?.total || 0);
            pages = (rows.results || []).map((page) => {
              const title = String(page.title || "");
              const titleLower = title.toLocaleLowerCase("ko-KR");
              const titleMatch = terms.every((term) => titleLower.includes(term.toLocaleLowerCase("ko-KR")));
              return {
                title,
                created_at: page.created_at,
                updated_at: page.updated_at,
                match_type: titleMatch ? "title" : "content",
                snippet: titleMatch ? "" : makeSnippet(page.content)
              };
            });
          }
          let fileTotal = 0;
          let files = [];
          if (shouldSearchFiles) {
            await ensureImageSchema(env);
            const [count, rows] = await Promise.all([
              env.DB.prepare("SELECT COUNT(*) AS total FROM images WHERE " + fileCondition).bind(...fileParameters).first(),
              env.DB.prepare(
                "SELECT id, filename, content_type, created_at, (SELECT GROUP_CONCAT(alias, ' \xB7 ') FROM image_aliases WHERE image_aliases.image_id = images.id) AS aliases FROM images WHERE " + fileCondition + " ORDER BY CASE WHEN lower(filename) = lower(?) THEN 0 WHEN lower(filename) LIKE lower(?) ESCAPE '!' THEN 1 WHEN lower(filename) LIKE lower(?) ESCAPE '!' THEN 2 ELSE 3 END, created_at DESC, filename COLLATE NOCASE ASC LIMIT ? OFFSET ?"
              ).bind(...fileParameters, q, prefixPattern, phrasePattern, limit, fileOffset).all()
            ]);
            fileTotal = Number(count?.total || 0);
            files = rows.results || [];
          }
          const total = pageTotal + fileTotal;
          const pagesHasMore = pageTotal > pageOffset + pages.length;
          const filesHasMore = fileTotal > fileOffset + files.length;
          return response({
            pages,
            files,
            total,
            page_total: pageTotal,
            file_total: fileTotal,
            scope,
            limit,
            page_offset: pageOffset,
            file_offset: fileOffset,
            pages_has_more: pagesHasMore,
            files_has_more: filesHasMore,
            has_more: pagesHasMore || filesHasMore
          }, 200, cors);
        } else if (createdAfter && !Number.isNaN(Date.parse(createdAfter))) {
          result = await env.DB.prepare("SELECT title, created_at, updated_at FROM pages WHERE created_at > ? ORDER BY created_at DESC LIMIT 100").bind(createdAfter).all();
        } else {
          result = await env.DB.prepare("SELECT title, created_at, updated_at FROM pages ORDER BY updated_at DESC LIMIT 100").all();
        }
        return response({ pages: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/recent" && request.method === "GET") {
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some((column) => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }
        const result = await env.DB.prepare("SELECT id, title, editor, created_at, summary FROM revisions ORDER BY id DESC LIMIT 200").all();
        return response({ changes: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/backlinks" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const candidate = await env.DB.prepare("SELECT title, content, updated_at FROM pages WHERE content LIKE ? ORDER BY updated_at DESC LIMIT 1000").bind("%[[" + title + "%").all();
        const backlinks = [];
        for (const page of candidate.results || []) {
          if (page.title === title) continue;
          let count = 0;
          const links = String(page.content || "").matchAll(/\[\[([^\]]+)\]\]/g);
          for (const link of links) {
            const target = String(link[1] || "").split("|")[0].split("#")[0].trim();
            if (target.toLocaleLowerCase() === title.toLocaleLowerCase()) count++;
          }
          if (count) backlinks.push({ title: page.title, updated_at: page.updated_at, count });
        }
        return response({ title, backlinks }, 200, cors);
      }
      if (url.pathname === "/api/categories" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT title, content FROM pages ORDER BY title COLLATE NOCASE LIMIT 10000").all();
        const categories = /* @__PURE__ */ new Map();
        for (const page of result.results || []) {
          const content = String(page.content || "");
          const isCategoryPage = /^(?:분류|category):/i.test(String(page.title || ""));
          const matches = content.matchAll(/\[\[(?:분류|category):([^\]|#]+)(?:\|[^\]]*)?\]\]/gi);
          for (const match of matches) {
            const name = String(match[1] || "").trim();
            if (!name) continue;
            const key = name.toLocaleLowerCase();
            const item = categories.get(key) || { name, count: 0, subcategoryCount: 0 };
            if (isCategoryPage) item.subcategoryCount++;
            else if (page.title !== "\uB300\uBB38") item.count++;
            categories.set(key, item);
          }
        }
        const values = [...categories.values()].sort((a, b) => a.name.localeCompare(b.name, "ko"));
        return response({ categories: values, total: values.length }, 200, cors);
      }
      if (url.pathname === "/api/category" && request.method === "GET") {
        const name = String(url.searchParams.get("name") || "").trim().replace(/^(?:분류|category):/i, "").slice(0, 120);
        if (!name) return response({ error: "\uBD84\uB958 \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const limit = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "100", 10) || 100));
        const offset = Math.min(1e6, Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0));
        const markers = [
          "[[\uBD84\uB958:" + name + "]]",
          "[[\uBD84\uB958:" + name + "|",
          "[[category:" + name + "]]",
          "[[category:" + name + "|"
        ];
        const membershipSql = "instr(lower(content), lower(?)) > 0 OR instr(lower(content), lower(?)) > 0 OR instr(lower(content), lower(?)) > 0 OR instr(lower(content), lower(?)) > 0";
        const [categoryPage, subcategories, countRow, pages] = await Promise.all([
          env.DB.prepare("SELECT title, content, updated_at FROM pages WHERE title = ? COLLATE NOCASE OR title = ? COLLATE NOCASE LIMIT 1").bind("\uBD84\uB958:" + name, "category:" + name).first(),
          env.DB.prepare("SELECT title, updated_at FROM pages WHERE (" + membershipSql + ") AND (lower(title) LIKE '\uBD84\uB958:%' OR lower(title) LIKE 'category:%') ORDER BY title COLLATE NOCASE ASC LIMIT 1000").bind(...markers).all(),
          env.DB.prepare("SELECT COUNT(*) AS total FROM pages WHERE (" + membershipSql + ") AND title <> '\uB300\uBB38' AND lower(title) NOT LIKE '\uBD84\uB958:%' AND lower(title) NOT LIKE 'category:%'").bind(...markers).first(),
          env.DB.prepare("SELECT title, updated_at FROM pages WHERE (" + membershipSql + ") AND title <> '\uB300\uBB38' AND lower(title) NOT LIKE '\uBD84\uB958:%' AND lower(title) NOT LIKE 'category:%' ORDER BY title COLLATE NOCASE ASC LIMIT ? OFFSET ?").bind(...markers, limit, offset).all()
        ]);
        const source = String(categoryPage?.content || "");
        const parentCategories = [...source.matchAll(/\[\[(?:분류|category):([^\]|#]+)(?:\|[^\]]*)?\]\]/gi)].map((match) => String(match[1] || "").trim()).filter(Boolean);
        const description = source.replace(/^\s*\[\[(?:분류|category):[^\]]+\]\]\s*$/gim, "").trim();
        const childItems = (subcategories.results || []).map((page) => ({
          title: page.title,
          name: String(page.title || "").replace(/^(?:분류|category):/i, ""),
          updated_at: page.updated_at
        }));
        return response({
          name,
          description,
          categoryUpdatedAt: categoryPage?.updated_at || "",
          parentCategories: [...new Set(parentCategories)],
          subcategories: childItems,
          pages: pages.results || [],
          total: Number(countRow?.total || 0),
          limit,
          offset
        }, 200, cors);
      }
      if (url.pathname === "/api/category" && request.method === "GET") {
        const name = String(url.searchParams.get("name") || "").trim().slice(0, 160);
        if (!name) return response({ error: "\uBD84\uB958 \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const patterns = [
          "%[[\uBD84\uB958:" + name + "]]%",
          "%[[\uBD84\uB958:" + name + "|%",
          "%[[category:" + name + "]]%",
          "%[[category:" + name + "|%"
        ];
        const result = await env.DB.prepare("SELECT title, updated_at FROM pages WHERE content LIKE ? OR content LIKE ? OR content LIKE ? OR content LIKE ? ORDER BY updated_at DESC LIMIT 500").bind(...patterns).all();
        return response({ name, pages: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/render" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const cached = namuPageResponseCache.get(title);
        if (cached && cached.expiresAt > Date.now()) {
          return response(cached.value, 200, { ...cors, "X-AonWiki-Render": "namumark-worker", "X-AonWiki-Cache": "HIT" });
        }
        if (namuPageResponsePending.has(title)) {
          const value2 = await namuPageResponsePending.get(title);
          return response(value2, 200, { ...cors, "X-AonWiki-Render": "namumark-worker", "X-AonWiki-Cache": "COALESCED" });
        }
        const pending = (async () => {
          await ensurePageProtectionSchema(env);
          const selectPage = async (pageTitle) => env.DB.prepare(
            "SELECT p.title, p.content, p.created_at, p.updated_at, pp.level AS protectionLevel, pp.reason AS protectionReason, pp.protected_by AS protectedBy, pp.updated_at AS protectionUpdatedAt FROM pages p LEFT JOIN page_protections pp ON pp.title = p.title WHERE p.title = ?"
          ).bind(pageTitle).first();
          let page = await selectPage(title);
          if (!page) {
            await ensurePageAliasSchema(env);
            const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
            if (alias) page = await selectPage(alias.title);
          }
          if (!page) return { page: null, html: "", engine: "namumark-worker" };
          const linkColors = await getPageLinkColors(env, page.title);
          const rendered = await renderNamuMarkupOnWorker(env, page.title, page.content || "", linkColors);
          return {
            page: {
              title: page.title,
              content: page.content || "",
              created_at: page.created_at,
              updated_at: page.updated_at,
              protectionLevel: page.protectionLevel || "none",
              protectionReason: page.protectionReason || "",
              protectedBy: page.protectedBy || "",
              protectionUpdatedAt: page.protectionUpdatedAt || ""
            },
            html: rendered.html,
            engine: "namumark-worker"
          };
        })().then((value2) => {
          namuPageResponseCache.set(title, { value: value2, expiresAt: Date.now() + 30 * 1e3 });
          if (namuPageResponseCache.size > 100) namuPageResponseCache.delete(namuPageResponseCache.keys().next().value);
          return value2;
        }).finally(() => namuPageResponsePending.delete(title));
        namuPageResponsePending.set(title, pending);
        const value = await pending;
        return response(value, 200, { ...cors, "X-AonWiki-Render": "namumark-worker", "X-AonWiki-Cache": "MISS" });
      }
      if (url.pathname === "/api/render" && request.method === "POST") {
        if (await authRateLimited(request, env, "namumark-preview", 240, 60 * 1e3)) {
          return response({ error: "\uBBF8\uB9AC\uBCF4\uAE30 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        }
        const body = await request.json();
        const title = cleanTitle(body.title || "\uBBF8\uB9AC\uBCF4\uAE30") || "\uBBF8\uB9AC\uBCF4\uAE30";
        const content = String(body.content || "");
        if (content.length > 2e5) return response({ error: "\uBBF8\uB9AC\uBCF4\uAE30 \uBB38\uC11C\uB294 200,000\uC790 \uC774\uD558\uB9CC \uC9C0\uC6D0\uD569\uB2C8\uB2E4." }, 413, cors);
        const previewUser = await currentUser(request, env);
        let linkColors = {};
        if (previewUser?.isAdmin) {
          const extractedColors = extractAdminLinkColors(content);
          if (extractedColors.errors.length) return response({ error: extractedColors.errors[0] }, 400, cors);
          linkColors = extractedColors.colors;
        } else {
          const existingPage = await findWikiPage(env, title);
          if (existingPage) linkColors = await getPageLinkColors(env, existingPage.title);
        }
        const rendered = await renderNamuMarkupOnWorker(env, title, content, linkColors);
        return response({ html: rendered.html, engine: "namumark-worker", title }, 200, {
          ...cors,
          "X-AonWiki-Render": "namumark-worker"
        });
      }
      if (url.pathname === "/api/page" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        let page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(title).first();
        if (!page) {
          await ensurePageAliasSchema(env);
          const alias = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
          if (alias) page = await env.DB.prepare("SELECT title, content, created_at, updated_at FROM pages WHERE title = ?").bind(alias.title).first();
        }
        await ensurePageProtectionSchema(env);
        const protection = page ? await env.DB.prepare("SELECT level, reason, protected_by, updated_at FROM page_protections WHERE title = ?").bind(page.title).first() : null;
        return response({ page: page ? { ...page, protectionLevel: protection?.level || "none", protectionReason: protection?.reason || "", protectedBy: protection?.protected_by || "", protectionUpdatedAt: protection?.updated_at || "" } : null }, 200, cors);
      }
      if (url.pathname === "/api/history" && request.method === "GET") {
        const title = cleanTitle(url.searchParams.get("title"));
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some((column) => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }
        const result = await env.DB.prepare("SELECT id, title, editor, created_at, summary FROM revisions WHERE title = ? ORDER BY id DESC LIMIT 50").bind(title).all();
        return response({ revisions: result.results || [] }, 200, cors);
      }
      if (url.pathname === "/api/revision" && request.method === "GET") {
        const id = Number(url.searchParams.get("id"));
        const title = cleanTitle(url.searchParams.get("title"));
        if (!Number.isSafeInteger(id) || id < 1) return response({ error: "\uC62C\uBC14\uB978 \uBC84\uC804 ID\uAC00 \uC544\uB2D9\uB2C8\uB2E4." }, 400, cors);
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC9C0\uC815\uD574\uC57C \uD569\uB2C8\uB2E4." }, 400, cors);
        const revision = await env.DB.prepare(
          "SELECT id, title, content, editor, created_at, summary FROM revisions WHERE id = ? AND title = ?"
        ).bind(id, title).first();
        if (!revision) return response({ error: "\uD574\uB2F9 \uBB38\uC11C\uC5D0 \uC18D\uD55C \uBC84\uC804\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        return response({ revision }, 200, cors);
      }
      if (url.pathname === "/api/revision/restore" && request.method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uBC84\uC804\uC744 \uBCF5\uC6D0\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        if (await authRateLimited(request, env, "revision-restore", 20, 60 * 1e3)) return response({ error: "\uBCF5\uC6D0 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        const body = await request.json(), id = Number(body.id), title = cleanTitle(body.title);
        if (!title || !Number.isSafeInteger(id) || id < 1) return response({ error: "\uBB38\uC11C \uC81C\uBAA9 \uB610\uB294 \uBC84\uC804 \uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }, 400, cors);
        await env.DB.prepare("CREATE TABLE IF NOT EXISTS revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, editor TEXT NOT NULL, created_at TEXT NOT NULL)").run();
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some((column) => column.name === "summary")) await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        const revision = await env.DB.prepare("SELECT id, title, content FROM revisions WHERE id = ? AND title = ?").bind(id, title).first();
        if (!revision) return response({ error: "\uD574\uB2F9 \uBB38\uC11C\uC5D0 \uC18D\uD55C \uBC84\uC804\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        const editPermission = await checkPageEditPermission(env, user, title);
        if (editPermission) return response({ error: editPermission.error }, editPermission.status, cors);
        const page = await env.DB.prepare("SELECT title, content FROM pages WHERE title = ?").bind(title).first();
        if (!page) return response({ error: "\uD604\uC7AC \uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString(), content = String(revision.content || "");
        const currentContent = String(page.content || "");
        if (currentContent !== content) {
          await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)").bind(title, currentContent, user.username, now, "\uBC84\uC804 \uBCF5\uC6D0 \uC9C1\uC804 \uC790\uB3D9 \uBCF4\uC874").run();
        }
        await env.DB.prepare("UPDATE pages SET content = ?, updated_at = ? WHERE title = ?").bind(content, now, title).run();
        await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)").bind(title, content, user.username, now, "\uC774\uC804 \uBC84\uC804 #" + id + " \uBCF5\uC6D0").run();
        invalidateNamuServerIndexes();
        await clearPersistentNamuRenderCache(env);
        return response({ ok: true, title, restored_revision: id, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/page" && request.method === "PUT") {
        const authenticatedUser = await currentUser(request, env);
        const user = authenticatedUser || anonymousEditorIdentity(request);
        if (user.isAnonymous && await authRateLimited(request, env, "anonymous-page-edit", 20, 10 * 60 * 1e3)) {
          return response({ error: "\uBE44\uB85C\uADF8\uC778 \uD3B8\uC9D1 \uC694\uCCAD\uC774 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. 10\uBD84 \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 429, cors);
        }
        const body = await request.json();
        const title = cleanTitle(body.title);
        const originalTitle = body.createOnly ? "" : cleanTitle(body.originalTitle || "");
        const content = String(body.content || "");
        if (!title) return response({ error: "\uBB38\uC11C \uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        if (user.isAnonymous && originalTitle && originalTitle !== title) {
          return response({ error: "\uBE44\uB85C\uADF8\uC778 \uD3B8\uC9D1\uC5D0\uC11C\uB294 \uBB38\uC11C \uC81C\uBAA9\uC744 \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 403, cors);
        }
        const protectionTitle = cleanTitle(body.originalTitle || title);
        const editPermission = await checkPageEditPermission(env, user, title, protectionTitle);
        if (editPermission) return response({ error: editPermission.error }, editPermission.status, cors);
        if (content.length > 2e5) return response({ error: "\uBB38\uC11C\uB294 200,000\uC790 \uC774\uD558\uB85C \uC791\uC131\uD574 \uC8FC\uC138\uC694." }, 413, cors);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const summary = String(body.summary || "").trim().slice(0, 200);
        const extractedLinkColors = extractAdminLinkColors(content);
        if (user.isAdmin && extractedLinkColors.errors.length) return response({ error: extractedLinkColors.errors[0] }, 400, cors);
        const columns = await env.DB.prepare("PRAGMA table_info(revisions)").all();
        if (!(columns.results || []).some((column) => column.name === "summary")) {
          await env.DB.prepare("ALTER TABLE revisions ADD COLUMN summary TEXT NOT NULL DEFAULT ''").run();
        }
        let previous = null;
        if (body.createOnly) {
          previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(title).first();
          if (previous) return response({ error: "\uAC19\uC740 \uC81C\uBAA9\uC758 \uBB38\uC11C\uAC00 \uC774\uBBF8 \uC788\uC2B5\uB2C8\uB2E4." }, 409, cors);
          await env.DB.prepare("INSERT INTO pages (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)").bind(title, content, now, now).run();
        } else if (originalTitle && originalTitle !== title) {
          await ensurePageAliasSchema(env);
          previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(originalTitle).first();
          if (!previous) return response({ error: "\uC774\uC804 \uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694." }, 404, cors);
          const occupied = await env.DB.prepare("SELECT title FROM pages WHERE title = ? COLLATE NOCASE").bind(title).first();
          if (occupied) return response({ error: "\uBCC0\uACBD\uD560 \uC81C\uBAA9\uC774 \uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC785\uB2C8\uB2E4." }, 409, cors);
          const aliasCollision = await env.DB.prepare("SELECT title FROM page_aliases WHERE alias = ? COLLATE NOCASE").bind(title).first();
          if (aliasCollision && aliasCollision.title !== originalTitle) {
            return response({ error: "\uBCC0\uACBD\uD560 \uC81C\uBAA9\uC774 \uB2E4\uB978 \uBB38\uC11C\uC758 \uC774\uC804 \uC81C\uBAA9\uC73C\uB85C \uC0AC\uC6A9 \uC911\uC785\uB2C8\uB2E4." }, 409, cors);
          }
          await env.DB.prepare("UPDATE pages SET title = ?, content = ?, updated_at = ? WHERE title = ?").bind(title, content, now, originalTitle).run();
          await env.DB.prepare("UPDATE revisions SET title = ? WHERE title = ?").bind(title, originalTitle).run();
          await env.DB.prepare("UPDATE page_aliases SET title = ? WHERE title = ?").bind(title, originalTitle).run();
          await env.DB.prepare("INSERT INTO page_aliases (alias, title, created_at) VALUES (?, ?, ?) ON CONFLICT(alias) DO UPDATE SET title = excluded.title, created_at = excluded.created_at").bind(originalTitle, title, now).run();
          await ensurePageLinkColorsSchema(env);
          await env.DB.prepare("UPDATE page_link_colors SET title = ? WHERE title = ?").bind(title, originalTitle).run();
        } else {
          previous = await env.DB.prepare("SELECT created_at FROM pages WHERE title = ?").bind(title).first();
          if (!previous) return response({ error: "\uC218\uC815\uD560 \uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
          await env.DB.prepare("UPDATE pages SET content = ?, updated_at = ? WHERE title = ?").bind(content, now, title).run();
        }
        invalidateNamuServerIndexes();
        await clearPersistentNamuRenderCache(env);
        await env.DB.prepare("INSERT INTO revisions (title, content, editor, created_at, summary) VALUES (?, ?, ?, ?, ?)").bind(title, content, user.username, now, summary).run();
        if (user.isAdmin) await savePageLinkColors(env, title, extractedLinkColors, user.username);
        return response({ ok: true, title, previous_title: originalTitle && originalTitle !== title ? originalTitle : null, updated_at: now }, 200, cors);
      }
      if (url.pathname === "/api/upload" && request.method === "POST") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uC774\uBBF8\uC9C0\uB97C \uC5C5\uB85C\uB4DC\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        const form = await request.formData();
        const file = form.get("file");
        if (!file || typeof file.arrayBuffer !== "function") return response({ error: "\uC774\uBBF8\uC9C0 \uD30C\uC77C\uC744 \uC120\uD0DD\uD558\uC138\uC694." }, 400, cors);
        const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
        if (!allowedTypes.includes(file.type)) return response({ error: "PNG, JPG, GIF, WebP, SVG \uD30C\uC77C\uB9CC \uC9C0\uC6D0\uD569\uB2C8\uB2E4." }, 415, cors);
        if (file.size < 1 || file.size > 1 * 1024 * 1024) return response({ error: "\uC774\uBBF8\uC9C0 \uD30C\uC77C\uC740 1MB \uC774\uD558\uB9CC \uC9C0\uC6D0\uD569\uB2C8\uB2E4." }, 413, cors);
        await ensureImageSchema(env);
        let bytes;
        if (file.type === "image/svg+xml") {
          try {
            const svg = validateSvgUpload(await file.text());
            bytes = new TextEncoder().encode(svg);
          } catch (error) {
            return response({ error: error.message || "SVG \uD30C\uC77C\uC744 \uD655\uC778\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 400, cors);
          }
        } else {
          bytes = new Uint8Array(await file.arrayBuffer());
        }
        let binary = "";
        for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
        const encoded = btoa(binary);
        const key = crypto.randomUUID();
        const requestedName = cleanImageName(form.get("filename") || file.name || "image", file.type);
        const dot = requestedName.lastIndexOf(".");
        const base = requestedName.slice(0, dot), extension = requestedName.slice(dot);
        let storedFilename = requestedName;
        let suffix = 2;
        while (await env.DB.prepare("SELECT id FROM images WHERE filename = ? COLLATE NOCASE").bind(storedFilename).first() || await env.DB.prepare("SELECT image_id FROM image_aliases WHERE alias = ? COLLATE NOCASE").bind(storedFilename).first()) {
          storedFilename = base + " (" + suffix++ + ")" + extension;
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await env.DB.prepare("INSERT INTO images (id, content_type, data_base64, filename, created_at, owner) VALUES (?, ?, ?, ?, ?, ?)").bind(key, file.type, encoded, storedFilename, now, user.username).run();
        return response({ ok: true, key, filename: storedFilename, url: new URL("/media/" + key, url.origin).href }, 201, cors);
      }
      if (url.pathname === "/api/file" && request.method === "GET") {
        await ensureImageSchema(env);
        const name = String(url.searchParams.get("name") || "").trim().slice(0, 160);
        if (!name) return response({ error: "\uD30C\uC77C \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        let image;
        if (/^[a-f0-9-]{36}$/i.test(name)) {
          image = await env.DB.prepare("SELECT id, filename, content_type, owner FROM images WHERE id = ?").bind(name).first();
        } else {
          image = await env.DB.prepare("SELECT id, filename, content_type, owner FROM images WHERE filename = ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 1").bind(name).first();
          if (!image) {
            image = await env.DB.prepare("SELECT images.id, images.filename, images.content_type, images.owner FROM image_aliases JOIN images ON images.id = image_aliases.image_id WHERE image_aliases.alias = ? COLLATE NOCASE LIMIT 1").bind(name).first();
          }
        }
        if (!image) return response({ error: "\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        return response({ image: { key: image.id, filename: image.filename, content_type: image.content_type, url: new URL("/media/" + image.id, url.origin).href } }, 200, cors);
      }
      if (url.pathname === "/api/file" && request.method === "PATCH") {
        const user = await currentUser(request, env);
        if (!user) return response({ error: "\uD30C\uC77C \uC774\uB984\uC744 \uBCC0\uACBD\uD558\uB824\uBA74 \uB85C\uADF8\uC778\uD558\uC138\uC694." }, 401, cors);
        await ensureImageSchema(env);
        const body = await request.json();
        const id = String(body.id || "");
        if (!/^[a-f0-9-]{36}$/i.test(id)) return response({ error: "\uC798\uBABB\uB41C \uD30C\uC77C \uC2DD\uBCC4\uC790\uC785\uB2C8\uB2E4." }, 400, cors);
        const image = await env.DB.prepare("SELECT id, filename, content_type, owner FROM images WHERE id = ?").bind(id).first();
        if (!image) return response({ error: "\uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
        if (!user.isAdmin && image.owner !== user.username) return response({ error: "\uBCF8\uC778\uC774 \uC62C\uB9B0 \uD30C\uC77C\uB9CC \uC774\uB984\uC744 \uBCC0\uACBD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }, 403, cors);
        if (!String(body.filename || "").trim()) return response({ error: "\uC0C8 \uD30C\uC77C \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694." }, 400, cors);
        const newFilename = cleanImageName(body.filename, image.content_type);
        const collision = await env.DB.prepare("SELECT id FROM images WHERE filename = ? COLLATE NOCASE AND id <> ?").bind(newFilename, id).first();
        const previousAliasCollision = await env.DB.prepare("SELECT image_id FROM image_aliases WHERE alias = ? COLLATE NOCASE AND image_id <> ?").bind(image.filename, id).first();
        if (previousAliasCollision) return response({ error: "\uC774\uC804 \uC774\uB984\uC774 \uB2E4\uB978 \uD30C\uC77C\uC5D0\uC11C \uC0AC\uC6A9 \uC911\uC774\uC5B4\uC11C \uC548\uC804\uD558\uAC8C \uBCC0\uACBD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 409, cors);
        const aliasCollision = await env.DB.prepare("SELECT image_id FROM image_aliases WHERE alias = ? COLLATE NOCASE AND image_id <> ?").bind(newFilename, id).first();
        if (collision || aliasCollision) return response({ error: "\uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC774\uAC70\uB098 \uC774\uC804 \uC774\uB984\uC73C\uB85C \uC608\uC57D\uB41C \uD30C\uC77C \uC774\uB984\uC785\uB2C8\uB2E4." }, 409, cors);
        if (newFilename !== image.filename) {
          await env.DB.prepare("INSERT INTO image_aliases (alias, image_id, created_at) VALUES (?, ?, ?) ON CONFLICT(alias) DO NOTHING").bind(image.filename, id, (/* @__PURE__ */ new Date()).toISOString()).run();
          await env.DB.prepare("UPDATE images SET filename = ? WHERE id = ?").bind(newFilename, id).run();
          await env.DB.prepare("DELETE FROM image_aliases WHERE alias = ? COLLATE NOCASE AND image_id = ?").bind(newFilename, id).run();
        }
        return response({ ok: true, id, filename: newFilename, previous_filename: image.filename }, 200, cors);
      }
      if (url.pathname === "/api/files" && request.method === "GET") {
        await ensureImageSchema(env);
        const manage = url.searchParams.get("manage") === "1";
        if (manage) {
          const user = await currentUser(request, env);
          if (!user) return response({ error: "\uD30C\uC77C \uAD00\uB9AC\uC5D0\uB294 \uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4." }, 401, cors);
          const result2 = user.isAdmin ? await env.DB.prepare("SELECT id, filename, content_type, created_at, owner FROM images ORDER BY created_at DESC LIMIT 500").all() : await env.DB.prepare("SELECT id, filename, content_type, created_at, owner FROM images WHERE owner = ? ORDER BY created_at DESC LIMIT 500").bind(user.username).all();
          return response({ files: result2.results || [], isAdmin: Boolean(user.isAdmin) }, 200, cors);
        }
        const result = await env.DB.prepare("SELECT id, filename, content_type, created_at FROM images ORDER BY created_at DESC LIMIT 500").all();
        const aliases = await env.DB.prepare("SELECT alias FROM image_aliases ORDER BY created_at DESC LIMIT 1000").all();
        return response({ files: result.results || [], aliases: aliases.results || [] }, 200, cors);
      }
      if (url.pathname.startsWith("/image/") && request.method === "GET") {
        await ensureImageSchema(env);
        const match = url.pathname.match(/^\/image\/([a-f0-9]{56})\.([a-z0-9]+)\.cache_v[0-9]+$/i);
        if (!match) return new Response("Not found", { status: 404 });
        const candidates = await env.DB.prepare("SELECT id, filename FROM images").all();
        let imageId = (candidates.results || []).find((item) => imageNameMatches(item.filename, match[1], match[2]))?.id;
        if (!imageId) {
          const aliases = await env.DB.prepare("SELECT alias, image_id FROM image_aliases").all();
          imageId = (aliases.results || []).find((item) => imageNameMatches(item.alias, match[1], match[2]))?.image_id;
        }
        if (!imageId) return new Response("Not found", { status: 404 });
        const image = await env.DB.prepare("SELECT content_type, data_base64 FROM images WHERE id = ?").bind(imageId).first();
        if (!image) return new Response("Not found", { status: 404 });
        const binary = atob(image.data_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const headers = new Headers(cors);
        headers.set("Content-Type", image.content_type);
        headers.set("Cache-Control", "public, max-age=86400");
        const etag = '"' + match[1] + "." + match[2] + '"';
        headers.set("ETag", etag);
        if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });
        headers.set("X-Content-Type-Options", "nosniff");
        if (image.content_type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
        return new Response(bytes, { headers });
      }
      if (url.pathname.startsWith("/media/") && request.method === "GET") {
        const key = url.pathname.slice("/media/".length);
        if (!/^[a-f0-9-]{36}$/i.test(key)) return new Response("Not found", { status: 404 });
        const image = await env.DB.prepare("SELECT content_type, data_base64 FROM images WHERE id = ?").bind(key).first();
        if (!image) return new Response("Not found", { status: 404 });
        const binary = atob(image.data_base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const headers = new Headers(cors);
        headers.set("Content-Type", image.content_type);
        headers.set("Cache-Control", "public, max-age=3600");
        headers.set("X-Content-Type-Options", "nosniff");
        if (image.content_type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");
        return new Response(bytes, { headers });
      }
      return response({ error: "\uC694\uCCAD\uD55C \uACBD\uB85C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }, 404, cors);
    } catch (error) {
      console.error("AonWiki API error", error);
      return response({ error: "\uC11C\uBC84 \uB0B4\uBD80 \uC624\uB958" }, 500, cors);
    }
  }
};
export {
  index_default as default
};
