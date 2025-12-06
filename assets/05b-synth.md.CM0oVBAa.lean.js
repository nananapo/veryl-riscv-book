import{_ as c,c as p,o as l,ah as e,j as a,a as s,aH as o,aI as t,aJ as d,aK as r,aL as i,aM as b,aN as h,aO as f,aP as _,aQ as m,aR as u,aS as g,aT as y,aU as j,aV as E,aW as k,aX as P,aY as L,aZ as D,a_ as C,a$ as v,b0 as w,b1 as A,b2 as x,b3 as T,b4 as M,b5 as I,b6 as N,b7 as O,b8 as R,b9 as S,ba as q,bb as V,bc as F,bd as Y,be as U,bf as G,bg as H,bh as K,bi as Q,bj as W,bk as Z,bl as X,bm as z,bn as B,bo as $,bp as J,bq as aa,br as sa,bs as ea,bt as na,bu as ca,bv as pa,bw as la,bx as oa}from"./chunks/framework.CEJaIMET.js";const ma=JSON.parse('{"title":"CPUの合成","description":"","frontmatter":{},"headers":[],"relativePath":"05b-synth.md","filePath":"05b-synth.md"}'),ta={name:"05b-synth.md"};function da(ra,n,ia,ba,ha,fa){return l(),p("div",null,[...n[0]||(n[0]=[e("",32),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"module"),s(` csrunit (
    clk        : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"clock"),s(`       ,
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s("    rst        : "),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"reset"),s(`       ,
    valid      : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s(`       ,
    pc         : `),a("span",{class:"hljs-keyword"},"input"),s(`  Addr        ,
    ctrl       : `),a("span",{class:"hljs-keyword"},"input"),s(`  InstCtrl    ,
    rd_addr    : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s("   <"),a("span",{class:"hljs-number"},"5"),s(`> ,
    csr_addr   : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s("   <"),a("span",{class:"hljs-number"},"12"),s(`>,
`)])]),s("    rs1        : "),a("span",{class:"hljs-keyword"},"input"),s(`  UIntX       ,
    rdata      : `),a("span",{class:"hljs-keyword"},"output"),s(` UIntX       ,
    raise_trap : `),a("span",{class:"hljs-keyword"},"output"),s(),a("span",{class:"hljs-keyword"},"logic"),s(`       ,
    trap_vector: `),a("span",{class:"hljs-keyword"},"output"),s(` Addr        ,
    `),a("span",{class:"custom-hl-bold"},[s("led        : "),a("span",{class:"hljs-keyword"},"output"),s(" UIntX       ,")]),s(`
) {
`)])])],-1),e("",14),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"inst"),s(` csru: csrunit (
    clk                            ,
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s(`    rst                            ,
    valid   : mems_valid           ,
    pc      : mems_pc              ,
    ctrl    : mems_ctrl            ,
    rd_addr : mems_rd_addr         ,
    csr_addr: mems_inst_bits[`),a("span",{class:"hljs-number"},"31"),s(":"),a("span",{class:"hljs-number"},"20"),s(`],
    rs1     : `),a("span",{class:"hljs-keyword"},"if"),s(" mems_ctrl.funct3["),a("span",{class:"hljs-number"},"2"),s("] == "),a("span",{class:"hljs-number"},"1"),s(" && mems_ctrl.funct3["),a("span",{class:"hljs-number"},"1"),s(":"),a("span",{class:"hljs-number"},"0"),s("] != "),a("span",{class:"hljs-number"},"0"),s(` ?
        {`),a("span",{class:"hljs-number"},"1'b0"),s(),a("span",{class:"hljs-keyword"},"repeat"),s(" XLEN - $bits(memq_rdata.rs1_addr), memq_rdata.rs1_addr} "),a("span",{class:"hljs-comment"},"// rs1を0で拡張する"),s(`
    :
        memq_rdata.rs1_data
`)])]),s(`    ,
    rdata      : csru_rdata      ,
    raise_trap : csru_raise_trap ,
    trap_vector: csru_trap_vector,
    `),a("span",{class:"custom-hl-bold"},"led                          ,"),s(`
);
`)])])],-1),e("",265)])])}const ua=c(ta,[["render",da]]);export{ma as __pageData,ua as default};
