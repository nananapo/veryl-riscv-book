import{_ as t,c as l,o as c,ah as e,j as a,a as s,aG as p,aH as o,aI as d,aJ as r,aK as i,aL as b,aM as h,aN as f,aO as _,aP as g,aQ as m,aR as u,aS as y,aT as w,aU as E,aV as j,aW as k,aX as P,aY as L,aZ as C,a_ as x,a$ as D,b0 as v,b1 as A,b2 as T,b3 as I,b4 as M,b5 as N,b6 as O,b7 as R,b8 as S,b9 as q,ba as V,bb as F,bc as Y,bd as U,be as G,bf as H,bg as K,bh as W,bi as Q,bj as Z,bk as X,bl as z,bm as B,bn as $,bo as J,bp as aa,bq as sa,br as ea,bs as na,bt as ta,bu as la,bv as ca,bw as pa,bx as oa,by as da}from"./chunks/framework.HhScKIQu.js";const ua=JSON.parse('{"title":"CPUの合成","description":"","frontmatter":{},"headers":[],"relativePath":"05b-synth.md","filePath":"05b-synth.md"}'),ra={name:"05b-synth.md"};function ia(ba,n,ha,fa,_a,ga){return c(),l("div",null,[...n[0]||(n[0]=[e("",32),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"module"),s(` csrunit (
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
`)])])],-1),e("",125),a("iframe",{width:"100%","max-width":"640",style:{"aspect-ratio":"16 / 9"},src:"https://www.youtube.com/embed/OpXiXha-ZnI",title:"tangnano9k test ledcounter",frameborder:"0",allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",referrerpolicy:"strict-origin-when-cross-origin",allowfullscreen:""},null,-1),e("",138),a("iframe",{width:"100%","max-width":"640",style:{"aspect-ratio":"16 / 9"},src:"https://www.youtube.com/embed/byCr_464dW4",title:"",frameborder:"0",allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",referrerpolicy:"strict-origin-when-cross-origin",allowfullscreen:""},null,-1),e("",2)])])}const ya=t(ra,[["render",ia]]);export{ua as __pageData,ya as default};
