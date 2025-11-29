import{_ as c,c as l,o as p,ah as n,j as s,a,bW as d,bX as t,bY as o,bZ as r,b_ as i,b$ as f,c0 as b,c1 as h,c2 as u,c3 as m,c4 as y,c5 as _}from"./chunks/framework.BNheOMQd.js";const T=JSON.parse('{"title":"S-modeの実装 (2. 仮想記憶システム)","description":"","frontmatter":{},"headers":[],"relativePath":"24-impl-paging.md","filePath":"24-impl-paging.md"}'),v={name:"24-impl-paging.md"};function j(w,e,g,k,E,C){return p(),l("div",null,[...e[0]||(e[0]=[n("",113),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"module"),a(` csrunit (
    clk        : `),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"clock"),a(`                   ,
    rst        : `),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"reset"),a(`                   ,
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a("    valid      : "),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"logic"),a(`                   ,
    pc         : `),s("span",{class:"hljs-keyword"},"input"),a(`   Addr                    ,
    inst_bits  : `),s("span",{class:"hljs-keyword"},"input"),a(`   Inst                    ,
    ctrl       : `),s("span",{class:"hljs-keyword"},"input"),a(`   InstCtrl                ,
    expt_info  : `),s("span",{class:"hljs-keyword"},"input"),a(`   ExceptionInfo           ,
    rd_addr    : `),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"logic"),a("               <"),s("span",{class:"hljs-number"},"5"),a(`> ,
    csr_addr   : `),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"logic"),a("               <"),s("span",{class:"hljs-number"},"12"),a(`>,
    rs1_addr   : `),s("span",{class:"hljs-keyword"},"input"),a("   "),s("span",{class:"hljs-keyword"},"logic"),a("               <"),s("span",{class:"hljs-number"},"5"),a(`> ,
`)])]),a("    rs1_data   : "),s("span",{class:"hljs-keyword"},"input"),a(`   UIntX                   ,
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
`)])])],-1),s("p",null,[s("span",{class:"caption"},"▼リスト18.21: csrunitモジュールにメモリアドレスとインターフェースを割り当てる (core.veryl)"),a(),s("a",{href:"https://github.com/nananapo/bluecore/compare/9e7879dc3f5ef27804a750564e20ee8a08de8049~1..9e7879dc3f5ef27804a750564e20ee8a08de8049#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510"},"差分をみる")],-1),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"inst"),a(` csru: csrunit (
    clk                               ,
    rst                               ,
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a(`    valid      : mems_valid           ,
    pc         : mems_pc              ,
    inst_bits  : mems_inst_bits       ,
    ctrl       : mems_ctrl            ,
    expt_info  : mems_expt            ,
    rd_addr    : mems_rd_addr         ,
    csr_addr   : mems_inst_bits[`),s("span",{class:"hljs-number"},"31"),a(":"),s("span",{class:"hljs-number"},"20"),a(`],
    rs1_addr   : memq_rdata.rs1_addr  ,
`)])]),a(`    rs1_data   : memq_rdata.rs1_data  ,
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
`)])])],-1),n("",216)])])}const S=c(v,[["render",j]]);export{T as __pageData,S as default};
