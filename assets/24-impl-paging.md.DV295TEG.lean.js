import{_ as l,c as p,o as c,ah as e,j as a,a as s,bV as t,bW as d,bX as o,bY as r,bZ as i,b_ as b,b$ as f,c0 as h,c1 as u,c2 as m,c3 as y,c4 as _}from"./chunks/framework.HhScKIQu.js";const T=JSON.parse('{"title":"S-modeの実装 (2. 仮想記憶システム)","description":"","frontmatter":{},"headers":[],"relativePath":"24-impl-paging.md","filePath":"24-impl-paging.md"}'),v={name:"24-impl-paging.md"};function j(w,n,g,k,E,C){return c(),p("div",null,[...n[0]||(n[0]=[e("",136),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"module"),s(` csrunit (
    clk        : `),a("span",{class:"hljs-keyword"},"input"),s("   "),a("span",{class:"hljs-keyword"},"clock"),s(`                   ,
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s("    rst        : "),a("span",{class:"hljs-keyword"},"input"),s("   "),a("span",{class:"hljs-keyword"},"reset"),s(`                   ,
    valid      : `),a("span",{class:"hljs-keyword"},"input"),s("   "),a("span",{class:"hljs-keyword"},"logic"),s(`                   ,
    pc         : `),a("span",{class:"hljs-keyword"},"input"),s(`   Addr                    ,
    inst_bits  : `),a("span",{class:"hljs-keyword"},"input"),s(`   Inst                    ,
    ctrl       : `),a("span",{class:"hljs-keyword"},"input"),s(`   InstCtrl                ,
    expt_info  : `),a("span",{class:"hljs-keyword"},"input"),s(`   ExceptionInfo           ,
    rd_addr    : `),a("span",{class:"hljs-keyword"},"input"),s("   "),a("span",{class:"hljs-keyword"},"logic"),s("               <"),a("span",{class:"hljs-number"},"5"),s(`> ,
`)])]),s("    csr_addr   : "),a("span",{class:"hljs-keyword"},"input"),s("   "),a("span",{class:"hljs-keyword"},"logic"),s("               <"),a("span",{class:"hljs-number"},"12"),s(`>,
    rs1_addr   : `),a("span",{class:"hljs-keyword"},"input"),s("   "),a("span",{class:"hljs-keyword"},"logic"),s("               <"),a("span",{class:"hljs-number"},"5"),s(`> ,
    rs1_data   : `),a("span",{class:"hljs-keyword"},"input"),s(`   UIntX                   ,
    can_intr   : `),a("span",{class:"hljs-keyword"},"input"),s("   "),a("span",{class:"hljs-keyword"},"logic"),s(`                   ,
    `),a("span",{class:"custom-hl-bold"},[s("mem_addr   : "),a("span",{class:"hljs-keyword"},"input"),s("   Addr                    ,")]),s(`
    rdata      : `),a("span",{class:"hljs-keyword"},"output"),s(`  UIntX                   ,
    mode       : `),a("span",{class:"hljs-keyword"},"output"),s(`  PrivMode                ,
    raise_trap : `),a("span",{class:"hljs-keyword"},"output"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s(`                   ,
    trap_vector: `),a("span",{class:"hljs-keyword"},"output"),s(`  Addr                    ,
    trap_return: `),a("span",{class:"hljs-keyword"},"output"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s(`                   ,
    minstret   : `),a("span",{class:"hljs-keyword"},"input"),s(`   UInt64                  ,
    led        : `),a("span",{class:"hljs-keyword"},"output"),s(`  UIntX                   ,
    aclint     : `),a("span",{class:"hljs-keyword"},"modport"),s(` aclint_if::slave        ,
    `),a("span",{class:"custom-hl-bold"},[s("membus     : "),a("span",{class:"hljs-keyword"},"modport"),s(" core_data_if::master    ,")]),s(`
) {
`)])])],-1),a("p",null,[a("span",{class:"caption"},"▼リスト18.21: csrunitモジュールにメモリアドレスとインターフェースを割り当てる (core.veryl)"),s(),a("a",{href:"https://github.com/nananapo/bluecore/compare/214a5ba841cb88190f4077e3a12315912589d861~1..214a5ba841cb88190f4077e3a12315912589d861#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510"},"差分をみる")],-1),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"inst"),s(` csru: csrunit (
    clk                               ,
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},`    rst                               ,
    valid      : mems_valid           ,
    pc         : mems_pc              ,
    inst_bits  : mems_inst_bits       ,
    ctrl       : mems_ctrl            ,
    expt_info  : mems_expt            ,
    rd_addr    : mems_rd_addr         ,
`)]),s("    csr_addr   : mems_inst_bits["),a("span",{class:"hljs-number"},"31"),s(":"),a("span",{class:"hljs-number"},"20"),s(`],
    rs1_addr   : memq_rdata.rs1_addr  ,
    rs1_data   : memq_rdata.rs1_data  ,
    can_intr   : mems_is_new          ,
    `),a("span",{class:"custom-hl-bold"},"mem_addr   : memu_addr            ,"),s(`
    rdata      : csru_rdata           ,
    mode       : csru_priv_mode       ,
    raise_trap : csru_raise_trap      ,
    trap_vector: csru_trap_vector     ,
    trap_return: csru_trap_return     ,
    minstret                          ,
    led                               ,
    aclint                            ,
    `),a("span",{class:"custom-hl-bold"},"membus     : d_membus             ,"),s(`
);
`)])])],-1),e("",17),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"if"),s(` !core_if.is_hazard && fetch_fifo_rvalid {
    `),a("span",{class:"hljs-keyword"},"if"),s(" offset == "),a("span",{class:"hljs-number"},"6"),s(` {
        `),a("span",{class:"hljs-comment"},"// offsetが6な32ビット命令の場合、"),s(`
        `),a("span",{class:"hljs-comment"},"// 命令は{rdata_next[15:0], rdata[63:48}になる"),s(`
        `),a("span",{class:"hljs-keyword"},"if"),s(` issue_is_rdata_saved {
            issue_fifo_wvalid                 = `),a("span",{class:"hljs-number"},"1"),s(`;
            issue_fifo_wdata.addr             = {issue_saved_addr[`),a("span",{class:"hljs-keyword"},"msb"),s(":"),a("span",{class:"hljs-number"},"3"),s(`], offset};
            issue_fifo_wdata.bits             = {rdata[`),a("span",{class:"hljs-number"},"15"),s(":"),a("span",{class:"hljs-number"},"0"),s(`], issue_saved_bits};
            issue_fifo_wdata.is_rvc           = `),a("span",{class:"hljs-number"},"0"),s(`;
            `),a("span",{class:"custom-hl-bold"},[s("issue_fifo_wdata.expt.addr_offset = "),a("span",{class:"hljs-number"},"2"),s(";")]),s(`
        } `),a("span",{class:"hljs-keyword"},"else"),s(` {
            `),a("span",{class:"hljs-keyword"},"if"),s(` rvcc_is_rvc || expt.valid {
                fetch_fifo_rready       = issue_fifo_wready;
                issue_fifo_wvalid       = `),a("span",{class:"hljs-number"},"1"),s(`;
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s("                issue_fifo_wdata.addr   = {raddr["),a("span",{class:"hljs-keyword"},"msb"),s(":"),a("span",{class:"hljs-number"},"3"),s(`], offset};
                issue_fifo_wdata.is_rvc = `),a("span",{class:"hljs-number"},"1"),s(`;
                issue_fifo_wdata.bits   = rvcc_inst32;
            } `),a("span",{class:"hljs-keyword"},"else"),s(` {
                `),a("span",{class:"hljs-comment"},"// save inst[15:0]"),s(`
                fetch_fifo_rready = `),a("span",{class:"hljs-number"},"1"),s("; "),a("span",{class:"hljs-comment"},"// Read next 8 bytes"),s(`
`)])]),s(`            }
        }
`)])])],-1),e("",197)])])}const S=l(v,[["render",j]]);export{T as __pageData,S as default};
