import{_ as l,c as p,o as c,ah as e,j as s,a,bV as d,bW as t,bX as o,bY as r,bZ as i,b_ as f,b$ as b,c0 as h,c1 as u,c2 as m,c3 as y,c4 as _}from"./chunks/framework.HhScKIQu.js";const T=JSON.parse('{"title":"S-modeの実装 (2. 仮想記憶システム)","description":"","frontmatter":{},"headers":[],"relativePath":"24-impl-paging.md","filePath":"24-impl-paging.md"}'),v={name:"24-impl-paging.md"};function j(w,n,g,k,E,C){return c(),p("div",null,[...n[0]||(n[0]=[e("",136),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"module"),a(` csrunit (
    clk        : `),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"clock"),a(`                   ,
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a("    rst        : "),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"reset"),a(`                   ,
    valid      : `),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"logic"),a(`                   ,
    pc         : `),s("span",{class:"hljs-keyword"},"input"),a(`   Addr                    ,
    inst_bits  : `),s("span",{class:"hljs-keyword"},"input"),a(`   Inst                    ,
    ctrl       : `),s("span",{class:"hljs-keyword"},"input"),a(`   InstCtrl                ,
    expt_info  : `),s("span",{class:"hljs-keyword"},"input"),a(`   ExceptionInfo           ,
    rd_addr    : `),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"logic"),a("               <"),s("span",{class:"hljs-number"},"5"),a(`> ,
`)])]),a("    csr_addr   : "),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"logic"),a("               <"),s("span",{class:"hljs-number"},"12"),a(`>,
    rs1_addr   : `),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"logic"),a("               <"),s("span",{class:"hljs-number"},"5"),a(`> ,
    rs1_data   : `),s("span",{class:"hljs-keyword"},"input"),a(`   UIntX                   ,
    can_intr   : `),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"logic"),a(`                   ,
    `),s("span",{class:"custom-hl-bold"},[a("mem_addr   : "),s("span",{class:"hljs-keyword"},"input"),a("   Addr                    ,")]),a(`
    rdata      : `),s("span",{class:"hljs-keyword"},"output"),a(`  UIntX                   ,
    mode       : `),s("span",{class:"hljs-keyword"},"output"),a(`  PrivMode                ,
    raise_trap : `),s("span",{class:"hljs-keyword"},"output"),a("  "),s("span",{class:"hljs-keyword"},"logic"),a(`                   ,
    trap_vector: `),s("span",{class:"hljs-keyword"},"output"),a(`  Addr                    ,
    trap_return: `),s("span",{class:"hljs-keyword"},"output"),a("  "),s("span",{class:"hljs-keyword"},"logic"),a(`                   ,
    minstret   : `),s("span",{class:"hljs-keyword"},"input"),a(`   UInt64                  ,
    led        : `),s("span",{class:"hljs-keyword"},"output"),a(`  UIntX                   ,
    aclint     : `),s("span",{class:"hljs-keyword"},"modport"),a(` aclint_if::slave        ,
    `),s("span",{class:"custom-hl-bold"},[a("membus     : "),s("span",{class:"hljs-keyword"},"modport"),a(" core_data_if::master    ,")]),a(`
) {
`)])])],-1),s("p",null,[s("span",{class:"caption"},"▼リスト18.21: csrunitモジュールにメモリアドレスとインターフェースを割り当てる (core.veryl)"),a(),s("a",{href:"https://github.com/nananapo/bluecore/compare/a5ec66fd92d2ce4724be5756d43e7f972f8d3111~1..a5ec66fd92d2ce4724be5756d43e7f972f8d3111#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510"},"差分をみる")],-1),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"inst"),a(` csru: csrunit (
    clk                               ,
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},`    rst                               ,
    valid      : mems_valid           ,
    pc         : mems_pc              ,
    inst_bits  : mems_inst_bits       ,
    ctrl       : mems_ctrl            ,
    expt_info  : mems_expt            ,
    rd_addr    : mems_rd_addr         ,
`)]),a("    csr_addr   : mems_inst_bits["),s("span",{class:"hljs-number"},"31"),a(":"),s("span",{class:"hljs-number"},"20"),a(`],
    rs1_addr   : memq_rdata.rs1_addr  ,
    rs1_data   : memq_rdata.rs1_data  ,
    can_intr   : mems_is_new          ,
    `),s("span",{class:"custom-hl-bold"},"mem_addr   : memu_addr            ,"),a(`
    rdata      : csru_rdata           ,
    mode       : csru_priv_mode       ,
    raise_trap : csru_raise_trap      ,
    trap_vector: csru_trap_vector     ,
    trap_return: csru_trap_return     ,
    minstret                          ,
    led                               ,
    aclint                            ,
    `),s("span",{class:"custom-hl-bold"},"membus     : d_membus             ,"),a(`
);
`)])])],-1),e("",17),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"if"),a(` !core_if.is_hazard && fetch_fifo_rvalid {
    `),s("span",{class:"hljs-keyword"},"if"),a(" offset == "),s("span",{class:"hljs-number"},"6"),a(` {
        `),s("span",{class:"hljs-comment"},"// offsetが6な32ビット命令の場合、"),a(`
        `),s("span",{class:"hljs-comment"},"// 命令は{rdata_next[15:0], rdata[63:48}になる"),a(`
        `),s("span",{class:"hljs-keyword"},"if"),a(` issue_is_rdata_saved {
            issue_fifo_wvalid                 = `),s("span",{class:"hljs-number"},"1"),a(`;
            issue_fifo_wdata.addr             = {issue_saved_addr[`),s("span",{class:"hljs-keyword"},"msb"),a(":"),s("span",{class:"hljs-number"},"3"),a(`], offset};
            issue_fifo_wdata.bits             = {rdata[`),s("span",{class:"hljs-number"},"15"),a(":"),s("span",{class:"hljs-number"},"0"),a(`], issue_saved_bits};
            issue_fifo_wdata.is_rvc           = `),s("span",{class:"hljs-number"},"0"),a(`;
            `),s("span",{class:"custom-hl-bold"},[a("issue_fifo_wdata.expt.addr_offset = "),s("span",{class:"hljs-number"},"2"),a(";")]),a(`
        } `),s("span",{class:"hljs-keyword"},"else"),a(` {
            `),s("span",{class:"hljs-keyword"},"if"),a(` rvcc_is_rvc || expt.valid {
                fetch_fifo_rready       = issue_fifo_wready;
                issue_fifo_wvalid       = `),s("span",{class:"hljs-number"},"1"),a(`;
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a("                issue_fifo_wdata.addr   = {raddr["),s("span",{class:"hljs-keyword"},"msb"),a(":"),s("span",{class:"hljs-number"},"3"),a(`], offset};
                issue_fifo_wdata.is_rvc = `),s("span",{class:"hljs-number"},"1"),a(`;
                issue_fifo_wdata.bits   = rvcc_inst32;
            } `),s("span",{class:"hljs-keyword"},"else"),a(` {
                `),s("span",{class:"hljs-comment"},"// save inst[15:0]"),a(`
                fetch_fifo_rready = `),s("span",{class:"hljs-number"},"1"),a("; "),s("span",{class:"hljs-comment"},"// Read next 8 bytes"),a(`
`)])]),a(`            }
        }
`)])])],-1),e("",197)])])}const S=l(v,[["render",j]]);export{T as __pageData,S as default};
