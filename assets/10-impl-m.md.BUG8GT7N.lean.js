import{_ as e,c as p,o as c,ah as l,j as s,a,bA as d}from"./chunks/framework.BNheOMQd.js";const j=JSON.parse('{"title":"M拡張の実装","description":"","frontmatter":{},"headers":[],"relativePath":"10-impl-m.md","filePath":"10-impl-m.md"}'),o={name:"10-impl-m.md"};function t(r,n,i,u,h,b){return c(),p("div",null,[...n[0]||(n[0]=[l("",146),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[a("State::WaitValid: "),s("span",{class:"hljs-keyword"},"if"),a(` is_mul && mu_rvalid {
    `),s("span",{class:"hljs-keyword"},"let"),a(" res_signed: "),s("span",{class:"hljs-keyword"},"logic"),a("<MUL_RES_WIDTH> = "),s("span",{class:"hljs-keyword"},"if"),a(" op1sign_saved != op2sign_saved ? ~mu_result + "),s("span",{class:"hljs-number"},"1"),a(` : mu_result;
    `),s("span",{class:"hljs-keyword"},"let"),a(" res_mulhsu: "),s("span",{class:"hljs-keyword"},"logic"),a("<MUL_RES_WIDTH> = "),s("span",{class:"hljs-keyword"},"if"),a(" op1sign_saved == "),s("span",{class:"hljs-number"},"1"),a(" ? ~mu_result + "),s("span",{class:"hljs-number"},"1"),a(` : mu_result;
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a(`    state      = State::Finish;
    result     = `),s("span",{class:"hljs-keyword"},"case"),a(" funct3_saved["),s("span",{class:"hljs-number"},"1"),a(":"),s("span",{class:"hljs-number"},"0"),a(`] {
        `),s("span",{class:"hljs-number"},"2'b00"),a("  : "),s("span",{class:"hljs-keyword"},"if"),a(" is_op32_saved ? sext::<"),s("span",{class:"hljs-number"},"32"),a(", "),s("span",{class:"hljs-number"},"64"),a(">(res_signed["),s("span",{class:"hljs-number"},"31"),a(":"),s("span",{class:"hljs-number"},"0"),a("]) : res_signed[XLEN - "),s("span",{class:"hljs-number"},"1"),a(":"),s("span",{class:"hljs-number"},"0"),a("], "),s("span",{class:"hljs-comment"},"// MUL, MULW"),a(`
        `),s("span",{class:"hljs-number"},"2'b01"),a("  : res_signed[XLEN+:XLEN], "),s("span",{class:"hljs-comment"},"// MULH"),a(`
        `),s("span",{class:"hljs-number"},"2'b10"),a("  : res_mulhsu[XLEN+:XLEN], "),s("span",{class:"hljs-comment"},"// MULHSU"),a(`
        `),s("span",{class:"hljs-number"},"2'b11"),a("  : mu_result[XLEN+:XLEN], "),s("span",{class:"hljs-comment"},"// MULHU"),a(`
`)])]),a("        "),s("span",{class:"hljs-keyword"},"default"),a(": "),s("span",{class:"hljs-number"},"0"),a(`,
    };
`),s("span",{class:"custom-hl-bold"},[a("} "),s("span",{class:"hljs-keyword"},"else"),a(),s("span",{class:"hljs-keyword"},"if"),a(" !is_mul && du_rvalid {")]),a(`
    `),s("span",{class:"custom-hl-bold"},[a("result = "),s("span",{class:"hljs-keyword"},"case"),a(" funct3_saved["),s("span",{class:"hljs-number"},"1"),a(":"),s("span",{class:"hljs-number"},"0"),a("] {")]),a(`
    `),s("span",{class:"custom-hl-bold"},[a("    "),s("span",{class:"hljs-number"},"2'b01"),a("  : du_quotient, "),s("span",{class:"hljs-comment"},"// DIVU")]),a(`
    `),s("span",{class:"custom-hl-bold"},[a("    "),s("span",{class:"hljs-number"},"2'b11"),a("  : du_remainder, "),s("span",{class:"hljs-comment"},"// REMU")]),a(`
    `),s("span",{class:"custom-hl-bold"},[a("    "),s("span",{class:"hljs-keyword"},"default"),a(": "),s("span",{class:"hljs-number"},"0"),a(",")]),a(`
    `),s("span",{class:"custom-hl-bold"},"};"),a(`
    `),s("span",{class:"custom-hl-bold"},"state = State::Finish;"),a(`
}
`)])])],-1),l("",35)])])}const f=e(o,[["render",t]]);export{j as __pageData,f as default};
