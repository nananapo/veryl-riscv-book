import{_ as c,c as l,o as p,ah as e,j as a,a as s,aH as o,aI as d,aJ as t,aK as r,aL as i,aM as b,aN as f,aO as h,aP as _,aQ as m,aR as u,aS as g,aT as y,aU as j,aV as k,aW as E,aX as P,aY as L,aZ as C,a_ as v,a$ as D,b0 as w,b1 as A,b2 as x,b3 as T,b4 as M,b5 as I,b6 as O,b7 as N,b8 as R,b9 as S,ba as q,bb as V,bc as F,bd as U,be as Y,bf as G,bg as H,bh as K,bi as W,bj as Q,bk as X,bl as Z,bm as z,bn as $,bo as B,bp as J,bq as aa,br as sa,bs as ea,bt as na,bu as ca,bv as la,bw as pa,bx as oa,by as da,bz as ta}from"./chunks/framework.BNheOMQd.js";const ga=JSON.parse('{"title":"CPUの合成","description":"","frontmatter":{},"headers":[],"relativePath":"05b-synth.md","filePath":"05b-synth.md"}'),ra={name:"05b-synth.md"};function ia(ba,n,fa,ha,_a,ma){return p(),l("div",null,[...n[0]||(n[0]=[e("",26),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"module"),s(` csrunit (
    clk        : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"clock"),s(`       ,
    rst        : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"reset"),s(`       ,
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s("    valid      : "),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s(`       ,
    pc         : `),a("span",{class:"hljs-keyword"},"input"),s(`  Addr        ,
    ctrl       : `),a("span",{class:"hljs-keyword"},"input"),s(`  InstCtrl    ,
    rd_addr    : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s("   <"),a("span",{class:"hljs-number"},"5"),s(`> ,
    csr_addr   : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s("   <"),a("span",{class:"hljs-number"},"12"),s(`>,
    rs1        : `),a("span",{class:"hljs-keyword"},"input"),s(`  UIntX       ,
    rdata      : `),a("span",{class:"hljs-keyword"},"output"),s(` UIntX       ,
`)])]),s("    raise_trap : "),a("span",{class:"hljs-keyword"},"output"),s(),a("span",{class:"hljs-keyword"},"logic"),s(`       ,
    trap_vector: `),a("span",{class:"hljs-keyword"},"output"),s(` Addr        ,
    `),a("span",{class:"custom-hl-bold"},[s("led        : "),a("span",{class:"hljs-keyword"},"output"),s(" UIntX       ,")]),s(`
) {
`)])])],-1),e("",14),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"inst"),s(` csru: csrunit (
    clk                            ,
    rst                            ,
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s(`    valid   : mems_valid           ,
    pc      : mems_pc              ,
    ctrl    : mems_ctrl            ,
    rd_addr : mems_rd_addr         ,
    csr_addr: mems_inst_bits[`),a("span",{class:"hljs-number"},"31"),s(":"),a("span",{class:"hljs-number"},"20"),s(`],
    rs1     : `),a("span",{class:"hljs-keyword"},"if"),s(" mems_ctrl.funct3["),a("span",{class:"hljs-number"},"2"),s("] == "),a("span",{class:"hljs-number"},"1"),s(" && mems_ctrl.funct3["),a("span",{class:"hljs-number"},"1"),s(":"),a("span",{class:"hljs-number"},"0"),s("] != "),a("span",{class:"hljs-number"},"0"),s(` ?
        {`),a("span",{class:"hljs-number"},"1'b0"),s(),a("span",{class:"hljs-keyword"},"repeat"),s(" XLEN - $bits(memq_rdata.rs1_addr), memq_rdata.rs1_addr} "),a("span",{class:"hljs-comment"},"// rs1を0で拡張する"),s(`
    :
        memq_rdata.rs1_data
    ,
    rdata      : csru_rdata      ,
`)])]),s(`    raise_trap : csru_raise_trap ,
    trap_vector: csru_trap_vector,
    `),a("span",{class:"custom-hl-bold"},"led                          ,"),s(`
);
`)])])],-1),e("",168)])])}const ya=c(ra,[["render",ia]]);export{ga as __pageData,ya as default};
