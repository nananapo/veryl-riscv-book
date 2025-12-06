import{_ as l,c as p,o as c,ah as e,j as a,a as s,aA as d,aB as t,aC as r,aD as o,aE as b,aF as i,aG as h}from"./chunks/framework.CEJaIMET.js";const v=JSON.parse('{"title":"CPUのパイプライン化","description":"","frontmatter":{},"headers":[],"relativePath":"05a-pipeline.md","filePath":"05a-pipeline.md"}'),m={name:"05a-pipeline.md"};function _(u,n,f,y,w,j){return c(),p("div",null,[...n[0]||(n[0]=[e("",78),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"inst"),s(` id_ex_fifo: fifo #(
    DATA_TYPE: exq_type,
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s("    WIDTH    : "),a("span",{class:"hljs-number"},"1"),s(`       ,
) (
    clk                   ,
    rst                   ,
    flush : control_hazard,
    wready: exq_wready    ,
    wvalid: exq_wvalid    ,
    wdata : exq_wdata     ,
    rready: exq_rready    ,
    rvalid: exq_rvalid    ,
    rdata : exq_rdata     ,
);

`),a("span",{class:"hljs-keyword"},"inst"),s(` ex_mem_fifo: fifo #(
    DATA_TYPE: memq_type,
    WIDTH    : `),a("span",{class:"hljs-number"},"1"),s(`        ,
) (
    clk                   ,
    rst                   ,
    flush : control_hazard,
    wready: memq_wready   ,
    wvalid: memq_wvalid   ,
    wdata : memq_wdata    ,
    rready: memq_rready   ,
    rvalid: memq_rvalid   ,
    rdata : memq_rdata    ,
);

`),a("span",{class:"hljs-keyword"},"inst"),s(` mem_wb_fifo: fifo #(
    DATA_TYPE: wbq_type,
`)])]),s("    WIDTH    : "),a("span",{class:"hljs-number"},"1"),s(`       ,
) (
    clk               ,
    rst               ,
    `),a("span",{class:"custom-hl-bold"},[s("flush : "),a("span",{class:"hljs-number"},"0")]),s(`         ,
    wready: wbq_wready,
    wvalid: wbq_wvalid,
    wdata : wbq_wdata ,
    rready: wbq_rready,
    rvalid: wbq_rvalid,
    rdata : wbq_rdata ,
);
`)])])],-1),e("",106)])])}const q=l(m,[["render",_]]);export{v as __pageData,q as default};
