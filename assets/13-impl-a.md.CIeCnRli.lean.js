import{_ as l,c,o as p,ah as n,j as a,a as s,bD as d,bE as t,bF as o}from"./chunks/framework.BNheOMQd.js";const j=JSON.parse('{"title":"A拡張の実装","description":"","frontmatter":{},"headers":[],"relativePath":"13-impl-a.md","filePath":"13-impl-a.md"}'),r={name:"13-impl-a.md"};function b(m,e,h,i,f,u){return p(),c("div",null,[...e[0]||(e[0]=[n("",34),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"struct"),s(` InstCtrl {
    itype    : InstType   , `),a("span",{class:"hljs-comment"},"// 命令の形式"),s(`
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s("    rwb_en   : "),a("span",{class:"hljs-keyword"},"logic"),s("      , "),a("span",{class:"hljs-comment"},"// レジスタに書き込むかどうか"),s(`
    is_lui   : `),a("span",{class:"hljs-keyword"},"logic"),s("      , "),a("span",{class:"hljs-comment"},"// LUI命令である"),s(`
    is_aluop : `),a("span",{class:"hljs-keyword"},"logic"),s("      , "),a("span",{class:"hljs-comment"},"// ALUを利用する命令である"),s(`
    is_muldiv: `),a("span",{class:"hljs-keyword"},"logic"),s("      , "),a("span",{class:"hljs-comment"},"// M拡張の命令である"),s(`
    is_op32  : `),a("span",{class:"hljs-keyword"},"logic"),s("      , "),a("span",{class:"hljs-comment"},"// OP-32またはOP-IMM-32である"),s(`
    is_jump  : `),a("span",{class:"hljs-keyword"},"logic"),s("      , "),a("span",{class:"hljs-comment"},"// ジャンプ命令である"),s(`
`)])]),s("    is_load  : "),a("span",{class:"hljs-keyword"},"logic"),s("      , "),a("span",{class:"hljs-comment"},"// ロード命令である"),s(`
    is_csr   : `),a("span",{class:"hljs-keyword"},"logic"),s("      , "),a("span",{class:"hljs-comment"},"// CSR命令である"),s(`
    `),a("span",{class:"custom-hl-bold"},[s("is_amo   : "),a("span",{class:"hljs-keyword"},"logic"),s("      , "),a("span",{class:"hljs-comment"},"// AMO instruction")]),s(`
    funct3   : `),a("span",{class:"hljs-keyword"},"logic"),s("   <"),a("span",{class:"hljs-number"},"3"),s(">, "),a("span",{class:"hljs-comment"},"// 命令のfunct3フィールド"),s(`
    funct7   : `),a("span",{class:"hljs-keyword"},"logic"),s("   <"),a("span",{class:"hljs-number"},"7"),s(">, "),a("span",{class:"hljs-comment"},"// 命令のfunct7フィールド"),s(`
}
`)])])],-1),n("",51),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"case"),s(` state {
    State::Init: `),a("span",{class:"hljs-keyword"},"if"),s(` is_new & inst_is_memop(ctrl) {
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s(`        state     = State::WaitReady;
        req_wen   = inst_is_store(ctrl);
        req_addr  = addr;
        req_wdata = rs2 << {addr[`),a("span",{class:"hljs-number"},"2"),s(":"),a("span",{class:"hljs-number"},"0"),s("], "),a("span",{class:"hljs-number"},"3'b0"),s(`};
        req_wmask = `),a("span",{class:"hljs-keyword"},"case"),s(" ctrl.funct3["),a("span",{class:"hljs-number"},"1"),s(":"),a("span",{class:"hljs-number"},"0"),s(`] {
            `),a("span",{class:"hljs-number"},"2'b00"),s(": "),a("span",{class:"hljs-number"},"8'b1"),s(" << addr["),a("span",{class:"hljs-number"},"2"),s(":"),a("span",{class:"hljs-number"},"0"),s(`],
            `),a("span",{class:"hljs-number"},"2'b01"),s(": "),a("span",{class:"hljs-keyword"},"case"),s(" addr["),a("span",{class:"hljs-number"},"2"),s(":"),a("span",{class:"hljs-number"},"0"),s(`] {
                `),a("span",{class:"hljs-number"},"6"),s("      : "),a("span",{class:"hljs-number"},"8'b11000000"),s(`,
                `),a("span",{class:"hljs-number"},"4"),s("      : "),a("span",{class:"hljs-number"},"8'b00110000"),s(`,
                `),a("span",{class:"hljs-number"},"2"),s("      : "),a("span",{class:"hljs-number"},"8'b00001100"),s(`,
                `),a("span",{class:"hljs-number"},"0"),s("      : "),a("span",{class:"hljs-number"},"8'b00000011"),s(`,
                `),a("span",{class:"hljs-keyword"},"default"),s(`: 'x,
            },
            `),a("span",{class:"hljs-number"},"2'b10"),s(": "),a("span",{class:"hljs-keyword"},"case"),s(" addr["),a("span",{class:"hljs-number"},"2"),s(":"),a("span",{class:"hljs-number"},"0"),s(`] {
                `),a("span",{class:"hljs-number"},"0"),s("      : "),a("span",{class:"hljs-number"},"8'b00001111"),s(`,
                `),a("span",{class:"hljs-number"},"4"),s("      : "),a("span",{class:"hljs-number"},"8'b11110000"),s(`,
                `),a("span",{class:"hljs-keyword"},"default"),s(`: 'x,
            },
            `),a("span",{class:"hljs-number"},"2'b11"),s("  : "),a("span",{class:"hljs-number"},"8'b11111111"),s(`,
`)])]),s("            "),a("span",{class:"hljs-keyword"},"default"),s(`: 'x,
        };
        `),a("span",{class:"custom-hl-bold"},"req_is_amo = ctrl.is_amo;"),s(`
        `),a("span",{class:"custom-hl-bold"},[s("req_amoop  = ctrl.funct7["),a("span",{class:"hljs-number"},"6"),s(":"),a("span",{class:"hljs-number"},"2"),s("] "),a("span",{class:"hljs-keyword"},"as"),s(" AMOOp;")]),s(`
        `),a("span",{class:"custom-hl-bold"},[s("req_aq     = ctrl.funct7["),a("span",{class:"hljs-number"},"1"),s("];")]),s(`
        `),a("span",{class:"custom-hl-bold"},[s("req_rl     = ctrl.funct7["),a("span",{class:"hljs-number"},"0"),s("];")]),s(`
        `),a("span",{class:"custom-hl-bold"},"req_funct3 = ctrl.funct3;"),s(`
    }
    State::WaitReady: `),a("span",{class:"hljs-keyword"},"if"),s(` membus.ready {
`)])])],-1),n("",18),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"function"),s(` accept_request_ff () {
    slave_saved.valid = slave.ready && slave.valid;
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s("    "),a("span",{class:"hljs-keyword"},"if"),s(` slave.ready && slave.valid {
        slave_saved.addr   = slave.addr;
        slave_saved.wen    = slave.wen;
        slave_saved.wdata  = slave.wdata;
        slave_saved.wmask  = slave.wmask;
        slave_saved.is_amo = slave.is_amo;
        slave_saved.amoop  = slave.amoop;
        slave_saved.aq     = slave.aq;
`)])]),s(`        slave_saved.rl     = slave.rl;
        slave_saved.funct3 = slave.funct3;
        `),a("span",{class:"custom-hl-bold"},[a("span",{class:"hljs-keyword"},"if"),s(" slave.is_amo {")]),s(`
        `),a("span",{class:"custom-hl-bold"},[s("    "),a("span",{class:"hljs-keyword"},"case"),s(" slave.amoop {")]),s(`
        `),a("span",{class:"custom-hl-bold"},"        AMOOp::LR: {"),s(`
        `),a("span",{class:"custom-hl-bold"},[s("            "),a("span",{class:"hljs-comment"},"// reserve address")]),s(`
        `),a("span",{class:"custom-hl-bold"},[s("            is_addr_reserved = "),a("span",{class:"hljs-number"},"1"),s(";")]),s(`
        `),a("span",{class:"custom-hl-bold"},"            reserved_addr    = slave.addr;"),s(`
        `),a("span",{class:"custom-hl-bold"},[s("            state            = "),a("span",{class:"hljs-keyword"},"if"),s(" master.ready ? State::WaitValid : State::WaitReady;")]),s(`
        `),a("span",{class:"custom-hl-bold"},"        }"),s(`
        `),a("span",{class:"custom-hl-bold"},[s("        "),a("span",{class:"hljs-keyword"},"default"),s(": {}")]),s(`
        `),a("span",{class:"custom-hl-bold"},"    }"),s(`
        `),a("span",{class:"custom-hl-bold"},[s("} "),a("span",{class:"hljs-keyword"},"else"),s(" {")]),s(`
            state = `),a("span",{class:"hljs-keyword"},"if"),s(` master.ready ? State::WaitValid : State::WaitReady;
        `),a("span",{class:"custom-hl-bold"},"}"),s(`
`)])])],-1),n("",53)])])}const v=l(r,[["render",b]]);export{j as __pageData,v as default};
