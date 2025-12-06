import{_ as l,c,o as p,ah as e,j as s,a,by as d}from"./chunks/framework.0mWUHcXH.js";const h=JSON.parse('{"title":"例外の実装","description":"","frontmatter":{},"headers":[],"relativePath":"11-impl-exception.md","filePath":"11-impl-exception.md"}'),t={name:"11-impl-exception.md"};function o(r,n,b,i,m,f){return p(),c("div",null,[...n[0]||(n[0]=[e("",24),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"always_comb"),a(` {
    `),s("span",{class:"hljs-comment"},"// EX -> MEM"),a(`
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},`    exq_rready            = memq_wready && !exs_stall;
    memq_wvalid           = exq_rvalid && !exs_stall;
    memq_wdata.addr       = exq_rdata.addr;
    memq_wdata.bits       = exq_rdata.bits;
    memq_wdata.ctrl       = exq_rdata.ctrl;
    memq_wdata.imm        = exq_rdata.imm;
    memq_wdata.rs1_addr   = exs_rs1_addr;
    memq_wdata.rs1_data   = exs_rs1_data;
`)]),a(`    memq_wdata.rs2_data   = exs_rs2_data;
    memq_wdata.alu_result = `),s("span",{class:"hljs-keyword"},"if"),a(` exs_ctrl.is_muldiv ? exs_muldiv_result : exs_alu_result;
    memq_wdata.br_taken   = exs_ctrl.is_jump || inst_is_br(exs_ctrl) && exs_brunit_take;
    memq_wdata.jump_addr  = `),s("span",{class:"hljs-keyword"},"if"),a(" inst_is_br(exs_ctrl) ? exs_pc + exs_imm : exs_alu_result & ~"),s("span",{class:"hljs-number"},"1"),a(`;
    `),s("span",{class:"custom-hl-bold"},"memq_wdata.expt       = exq_rdata.expt;"),a(`
}
`)])])],-1),e("",120)])])}const _=l(t,[["render",o]]);export{h as __pageData,_ as default};
