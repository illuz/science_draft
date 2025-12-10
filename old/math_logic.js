// 检查 Math.js 是否就位
if (typeof math === 'undefined') {
  alert("严重错误：math.min.js 未加载！\n请检查文件是否存在，或文件名是否正确。");
  throw new Error("Math.js missing");
}

// 初始化
const { create, all } = math;
const mathLib = create(all);

// 符号映射配置
const superscriptMap = {
'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
'5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
'+': '⁺', '-': '⁻', '(': '⁽', ')': '⁾', 'n': 'ⁿ', '.': '˙'
};
const reverseSuperscriptMap = Object.fromEntries(Object.entries(superscriptMap).map(([k, v]) => [v, k]));

// 自定义函数注入
const integrate = (expr, variable, start, end) => {
const step = 1000; const h = (end - start) / step; const f = mathLib.compile(expr); const scope = {};
let sum = 0; scope[variable] = start; sum += f.evaluate(scope); scope[variable] = end; sum += f.evaluate(scope);
for (let i = 1; i < step; i++) { scope[variable] = start + i * h; sum += (i % 2 === 0 ? 2 : 4) * f.evaluate(scope); }
return (h / 3) * sum;
};
const sigma = (expr, variable, start, end) => {
  let sum = 0; const f = mathLib.compile(expr); const scope = {};
  for(let i = start; i <= end; i++) { scope[variable] = i; sum += f.evaluate(scope); }
  return sum;
};
const combinations = (n, k) => { return mathLib.combinations(n, k); }

mathLib.import({ 
  d: mathLib.derivative, 
  int: integrate, 
  integral: integrate, 
  sigma: sigma,
  combinations: combinations
});

// 暴露 API
window.MathLogic = {
calculate: (input) => {
  if (!input || input.trim() === '') return null;
  let cleanInput = window.MathLogic.normalize(input);
  
  // 理科模式
  try {
    let res = mathLib.evaluate(cleanInput);
    if (res !== undefined) {
      if (res && res.isNode) return ' ' + res.toString();
      if (res && res.isMatrix) return ' ' + res.toString();
      let displayStr = res.toString();
      if (typeof res === 'number' && !Number.isInteger(res)) {
          displayStr = (Math.abs(res) < 0.0001) ? res.toExponential(4) : parseFloat(res.toFixed(4)).toString();
      }
      if (res.type === 'Unit') displayStr = ' ' + displayStr;
      return displayStr;
    }
  } catch (e) {}

  // 清洗模式
  try {
    let fuzzyExpression = cleanInput.replace(/[^0-9+\-*/().%^a-zA-Z]/g, ''); 
    if (fuzzyExpression && !/^[0-9.]+$/.test(fuzzyExpression)) {
       return mathLib.evaluate(fuzzyExpression).toString();
    }
  } catch (e) {}
  
  return null;
},

normalize: (displayStr) => {
  let s = displayStr;
  s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi').replace(/√/g, 'sqrt')
       .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=');
  
  const supChars = Object.values(superscriptMap).join('');
  const supRegex = new RegExp(`[${supChars}]+`, 'g');
  
  s = s.replace(supRegex, (match) => {
      let restored = match.split('').map(c => reverseSuperscriptMap[c]).join('');
      return '^' + restored; 
  });
  
  s = s.replace(/\^([+\-]\d+)/g, '^($1)');
  s = s.replace(/（/g, '(').replace(/）/g, ')').replace(/＝/g, '=');
  s = s.split('=')[0]; 
  return s;
},

toSuperscript: (str) => {
  let c = ""; for (let char of str) c += superscriptMap[char] || char; return c;
}
};
