import{_ as l,c as p,o as c,ah as e,j as s,a,ap as d,aq as t,ar as o,as as r}from"./chunks/framework.CEJaIMET.js";const _=JSON.parse('{"title":"RV32Iの実装","description":"","frontmatter":{},"headers":[],"relativePath":"04-impl-rv32i.md","filePath":"04-impl-rv32i.md"}'),i={name:"04-impl-rv32i.md"};function b(h,n,m,f,u,y){return c(),p("div",null,[...n[0]||(n[0]=[e("",478),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"always_ff"),a(` {
    `),s("span",{class:"hljs-keyword"},"if_reset"),a(` {
        if_pc           = `),s("span",{class:"hljs-number"},"0"),a(`;
        if_is_requested = `),s("span",{class:"hljs-number"},"0"),a(`;
        if_pc_requested = `),s("span",{class:"hljs-number"},"0"),a(`;
        if_fifo_wvalid  = `),s("span",{class:"hljs-number"},"0"),a(`;
        if_fifo_wdata   = `),s("span",{class:"hljs-number"},"0"),a(`;
    } `),s("span",{class:"hljs-keyword"},"else"),a(` {
        `),s("span",{class:"custom-hl-bold"},[s("span",{class:"hljs-keyword"},"if"),a(" control_hazard {")]),a(`
        `),s("span",{class:"custom-hl-bold"},"    if_pc           = control_hazard_pc_next;"),a(`
        `),s("span",{class:"custom-hl-bold"},[a("    if_is_requested = "),s("span",{class:"hljs-number"},"0"),a(";")]),a(`
        `),s("span",{class:"custom-hl-bold"},[a("    if_fifo_wvalid  = "),s("span",{class:"hljs-number"},"0"),a(";")]),a(`
        `),s("span",{class:"custom-hl-bold"},[a("} "),s("span",{class:"hljs-keyword"},"else"),a(" {")]),a(`
            `),s("span",{class:"hljs-keyword"},"if"),a(` if_is_requested {
                `),s("span",{class:"hljs-keyword"},"if"),a(` i_membus.rvalid {
                    if_is_requested = i_membus.ready && i_membus.valid;
                    `),s("span",{class:"hljs-keyword"},"if"),a(` i_membus.ready && i_membus.valid {
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a(`                        if_pc           = if_pc_next;
                        if_pc_requested = if_pc;
                    }
                }
            } `),s("span",{class:"hljs-keyword"},"else"),a(` {
                `),s("span",{class:"hljs-keyword"},"if"),a(` i_membus.ready && i_membus.valid {
                    if_is_requested = `),s("span",{class:"hljs-number"},"1"),a(`;
                    if_pc           = if_pc_next;
                    if_pc_requested = if_pc;
                }
            }
            `),s("span",{class:"hljs-comment"},"// IFのFIFOの制御"),a(`
            `),s("span",{class:"hljs-keyword"},"if"),a(` if_is_requested && i_membus.rvalid {
                if_fifo_wvalid     = `),s("span",{class:"hljs-number"},"1"),a(`;
                if_fifo_wdata.addr = if_pc_requested;
                if_fifo_wdata.bits = i_membus.rdata;
            } `),s("span",{class:"hljs-keyword"},"else"),a(` {
`)])]),a("                "),s("span",{class:"hljs-keyword"},"if"),a(` if_fifo_wvalid && if_fifo_wready {
                    if_fifo_wvalid = `),s("span",{class:"hljs-number"},"0"),a(`;
                }
            }
        `),s("span",{class:"custom-hl-bold"},"}"),a(`
    }
}
`)])])],-1),e("",51)])])}const w=l(i,[["render",b]]);export{_ as __pageData,w as default};
