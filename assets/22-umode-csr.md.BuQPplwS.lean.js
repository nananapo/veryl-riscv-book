import{_ as n,c as l,o as p,ah as c,j as a,a as s,bS as t}from"./chunks/framework.BNheOMQd.js";const h=JSON.parse('{"title":"U-modeの実装","description":"","frontmatter":{},"headers":[],"relativePath":"22-umode-csr.md","filePath":"22-umode-csr.md"}'),d={name:"22-umode-csr.md"};function o(r,e,b,f,i,u){return p(),l("div",null,[...e[0]||(e[0]=[c("",47),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"if"),s(` raise_trap {
    `),a("span",{class:"hljs-keyword"},"if"),s(` raise_expt || raise_interrupt {
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s("        mepc = "),a("span",{class:"hljs-keyword"},"if"),s(" raise_expt ? pc : "),a("span",{class:"hljs-comment"},"// exception"),s(`
         `),a("span",{class:"hljs-keyword"},"if"),s(" raise_interrupt && is_wfi ? pc + "),a("span",{class:"hljs-number"},"4"),s(" : pc; "),a("span",{class:"hljs-comment"},"// interrupt when wfi / interrupt"),s(`
        mcause = trap_cause;
        mtval  = `),a("span",{class:"hljs-keyword"},"if"),s(" raise_expt ? expt_value : "),a("span",{class:"hljs-number"},"0"),s(`;
        `),a("span",{class:"hljs-comment"},"// save mstatus.mie to mstatus.mpie"),s(`
        `),a("span",{class:"hljs-comment"},"// and set mstatus.mie = 0"),s(`
`)])]),s("        mstatus["),a("span",{class:"hljs-number"},"7"),s("] = mstatus["),a("span",{class:"hljs-number"},"3"),s(`];
        mstatus[`),a("span",{class:"hljs-number"},"3"),s("] = "),a("span",{class:"hljs-number"},"0"),s(`;
        `),a("span",{class:"custom-hl-bold"},[a("span",{class:"hljs-comment"},"// save current privilege level to mstatus.mpp")]),s(`
        `),a("span",{class:"custom-hl-bold"},[s("mstatus["),a("span",{class:"hljs-number"},"12"),s(":"),a("span",{class:"hljs-number"},"11"),s("] = mode;")]),s(`
    } `),a("span",{class:"hljs-keyword"},"else"),s(),a("span",{class:"hljs-keyword"},"if"),s(` trap_return {
        `),a("span",{class:"hljs-comment"},"// set mstatus.mie = mstatus.mpie"),s(`
        `),a("span",{class:"hljs-comment"},"//     mstatus.mpie = 1"),s(`
        mstatus[`),a("span",{class:"hljs-number"},"3"),s("] = mstatus["),a("span",{class:"hljs-number"},"7"),s(`];
        mstatus[`),a("span",{class:"hljs-number"},"7"),s("] = "),a("span",{class:"hljs-number"},"1"),s(`;
        `),a("span",{class:"custom-hl-bold"},[a("span",{class:"hljs-comment"},"// set mstatus.mpp = U (least privilege level)")]),s(`
        `),a("span",{class:"custom-hl-bold"},[s("mstatus["),a("span",{class:"hljs-number"},"12"),s(":"),a("span",{class:"hljs-number"},"11"),s("] = PrivMode::U;")]),s(`
    }
    mode = trap_mode_next;
`)])])],-1),c("",63)])])}const v=n(d,[["render",o]]);export{h as __pageData,v as default};
