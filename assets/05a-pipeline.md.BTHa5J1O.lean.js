import{_ as l,c as p,o as c,ah as n,j as a,a as s,aA as d,aB as t,aC as r,aD as o,aE as b,aF as i,aG as h}from"./chunks/framework.BNheOMQd.js";const v=JSON.parse('{"title":"CPUのパイプライン化","description":"","frontmatter":{},"headers":[],"relativePath":"05a-pipeline.md","filePath":"05a-pipeline.md"}'),m={name:"05a-pipeline.md"};function _(u,e,f,y,w,j){return c(),p("div",null,[...e[0]||(e[0]=[n("",66),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"inst"),s(` id_ex_fifo: fifo #(
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
    WIDTH    : `),a("span",{class:"hljs-number"},"1"),s(`       ,
) (
`)])]),s(`    clk               ,
    rst               ,
    `),a("span",{class:"custom-hl-bold"},[s("flush : "),a("span",{class:"hljs-number"},"0")]),s(`         ,
    wready: wbq_wready,
    wvalid: wbq_wvalid,
    wdata : wbq_wdata ,
    rready: wbq_rready,
    rvalid: wbq_rvalid,
    rdata : wbq_rdata ,
);
`)])])],-1),n("",38),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"var"),s(` memu_rdata: UIntX;
`),a("span",{class:"hljs-keyword"},"var"),s(" memu_stall: "),a("span",{class:"hljs-keyword"},"logic"),s(`;

`),a("span",{class:"hljs-keyword"},"inst"),s(` memu: memunit (
    clk                          ,
    rst                          ,
    valid : `),a("span",{class:"custom-hl-bold"},"mems"),s(`_valid           ,
    is_new: `),a("span",{class:"custom-hl-bold"},"mems"),s(`_is_new          ,
    ctrl  : `),a("span",{class:"custom-hl-bold"},"mems"),s(`_ctrl            ,
    addr  : `),a("span",{class:"custom-hl-bold"},"memq_rdata."),s(`alu_result,
    rs2   : `),a("span",{class:"custom-hl-bold"},"memq_rdata."),s(`rs2_data  ,
    rdata : memu_rdata           ,
    stall : memu_stall           ,
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s(`    membus: d_membus             ,
);

`),a("span",{class:"hljs-keyword"},"var"),s(` csru_rdata      : UIntX;
`),a("span",{class:"hljs-keyword"},"var"),s(" csru_raise_trap : "),a("span",{class:"hljs-keyword"},"logic"),s(`;
`),a("span",{class:"hljs-keyword"},"var"),s(` csru_trap_vector: Addr ;

`),a("span",{class:"hljs-keyword"},"inst"),s(` csru: csrunit (
`)])]),s(`    clk                            ,
    rst                            ,
    valid   : `),a("span",{class:"custom-hl-bold"},"mems"),s(`_valid           ,
    pc      : `),a("span",{class:"custom-hl-bold"},"mems"),s(`_pc              ,
    ctrl    : `),a("span",{class:"custom-hl-bold"},"mems"),s(`_ctrl            ,
    rd_addr : `),a("span",{class:"custom-hl-bold"},"mems"),s(`_rd_addr         ,
    csr_addr: `),a("span",{class:"custom-hl-bold"},"mems"),s("_inst_bits["),a("span",{class:"hljs-number"},"31"),s(":"),a("span",{class:"hljs-number"},"20"),s(`],
    rs1     : `),a("span",{class:"hljs-keyword"},"if"),s(),a("span",{class:"custom-hl-bold"},"mems"),s("_ctrl.funct3["),a("span",{class:"hljs-number"},"2"),s("] == "),a("span",{class:"hljs-number"},"1"),s(" && "),a("span",{class:"custom-hl-bold"},"mems"),s("_ctrl.funct3["),a("span",{class:"hljs-number"},"1"),s(":"),a("span",{class:"hljs-number"},"0"),s("] != "),a("span",{class:"hljs-number"},"0"),s(` ?
        {`),a("span",{class:"hljs-number"},"1'b0"),s(),a("span",{class:"hljs-keyword"},"repeat"),s(" XLEN - $bits("),a("span",{class:"custom-hl-bold"},"memq_rdata."),s("rs1_addr), "),a("span",{class:"custom-hl-bold"},"memq_rdata."),s("rs1_addr} "),a("span",{class:"hljs-comment"},"// rs1を0で拡張する"),s(`
    :
        `),a("span",{class:"custom-hl-bold"},"memq_rdata."),s(`rs1_data
    ,
    rdata      : csru_rdata      ,
    raise_trap : csru_raise_trap ,
    trap_vector: csru_trap_vector,
);
`)])])],-1),n("",66)])])}const q=l(m,[["render",_]]);export{v as __pageData,q as default};
