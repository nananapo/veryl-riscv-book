import{_ as e,c as p,o as c,ah as n,j as s,a,bF as r,bG as d}from"./chunks/framework.B0Vze7XN.js";const j=JSON.parse('{"title":"C拡張の実装","description":"","frontmatter":{},"headers":[],"relativePath":"14-impl-c.md","filePath":"14-impl-c.md"}'),t={name:"14-impl-c.md"};function o(i,l,h,b,f,m){return c(),p("div",null,[...l[0]||(l[0]=[n("",126),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"if"),a(" offset == "),s("span",{class:"hljs-number"},"6"),a(` {
    `),s("span",{class:"hljs-comment"},"// offsetが6な32ビット命令の場合、"),a(`
    `),s("span",{class:"hljs-comment"},"// 命令は{rdata_next[15:0], rdata[63:48}になる"),a(`
    `),s("span",{class:"hljs-keyword"},"if"),a(` issue_is_rdata_saved {
        issue_fifo_wvalid       = `),s("span",{class:"hljs-number"},"1"),a(`;
        issue_fifo_wdata.addr   = {issue_saved_addr[`),s("span",{class:"hljs-keyword"},"msb"),a(":"),s("span",{class:"hljs-number"},"3"),a(`], offset};
        issue_fifo_wdata.bits   = {rdata[`),s("span",{class:"hljs-number"},"15"),a(":"),s("span",{class:"hljs-number"},"0"),a(`], issue_saved_bits};
        `),s("span",{class:"custom-hl-bold"},[a("issue_fifo_wdata.is_rvc = "),s("span",{class:"hljs-number"},"0"),a(";")]),a(`
    } `),s("span",{class:"hljs-keyword"},"else"),a(` {
        `),s("span",{class:"hljs-comment"},"// Read next 8 bytes"),a(`
        fetch_fifo_rready = `),s("span",{class:"hljs-number"},"1"),a(`;
    }
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a("} "),s("span",{class:"hljs-keyword"},"else"),a(` {
    fetch_fifo_rready     = offset == `),s("span",{class:"hljs-number"},"4"),a(`;
    issue_fifo_wvalid     = `),s("span",{class:"hljs-number"},"1"),a(`;
    issue_fifo_wdata.addr = {raddr[`),s("span",{class:"hljs-keyword"},"msb"),a(":"),s("span",{class:"hljs-number"},"3"),a(`], offset};
    issue_fifo_wdata.bits = `),s("span",{class:"hljs-keyword"},"case"),a(` offset {
        `),s("span",{class:"hljs-number"},"0"),a("      : rdata["),s("span",{class:"hljs-number"},"31"),a(":"),s("span",{class:"hljs-number"},"0"),a(`],
`)])]),a("        "),s("span",{class:"hljs-number"},"2"),a("      : rdata["),s("span",{class:"hljs-number"},"47"),a(":"),s("span",{class:"hljs-number"},"16"),a(`],
        `),s("span",{class:"hljs-number"},"4"),a("      : rdata["),s("span",{class:"hljs-number"},"63"),a(":"),s("span",{class:"hljs-number"},"32"),a(`],
        `),s("span",{class:"hljs-keyword"},"default"),a(": "),s("span",{class:"hljs-number"},"0"),a(`,
    };
    `),s("span",{class:"custom-hl-bold"},[a("issue_fifo_wdata.is_rvc = "),s("span",{class:"hljs-number"},"0"),a(";")]),a(`
}
`)])])],-1),n("",44),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"if"),a(` !core_if.is_hazard && fetch_fifo_rvalid {
    `),s("span",{class:"hljs-keyword"},"if"),a(` issue_fifo_wready {
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a("        "),s("span",{class:"hljs-keyword"},"if"),a(" offset == "),s("span",{class:"hljs-number"},"6"),a(` {
            `),s("span",{class:"hljs-comment"},"// offsetが6な32ビット命令の場合、"),a(`
            `),s("span",{class:"hljs-comment"},"// 命令は{rdata_next[15:0], rdata[63:48}になる"),a(`
            `),s("span",{class:"hljs-keyword"},"if"),a(` issue_is_rdata_saved {
                issue_fifo_wvalid       = `),s("span",{class:"hljs-number"},"1"),a(`;
                issue_fifo_wdata.addr   = {issue_saved_addr[`),s("span",{class:"hljs-keyword"},"msb"),a(":"),s("span",{class:"hljs-number"},"3"),a(`], offset};
`)])]),a("                issue_fifo_wdata.bits   = {rdata["),s("span",{class:"hljs-number"},"15"),a(":"),s("span",{class:"hljs-number"},"0"),a(`], issue_saved_bits};
                issue_fifo_wdata.is_rvc = `),s("span",{class:"hljs-number"},"0"),a(`;
            } `),s("span",{class:"hljs-keyword"},"else"),a(` {
                fetch_fifo_rready = `),s("span",{class:"hljs-number"},"1"),a(`;
                `),s("span",{class:"custom-hl-bold"},[s("span",{class:"hljs-keyword"},"if"),a(" rvcc_is_rvc {")]),a(`
                `),s("span",{class:"custom-hl-bold"},[a("    issue_fifo_wvalid       = "),s("span",{class:"hljs-number"},"1"),a(";")]),a(`
                `),s("span",{class:"custom-hl-bold"},[a("    issue_fifo_wdata.addr   = {raddr["),s("span",{class:"hljs-keyword"},"msb"),a(":"),s("span",{class:"hljs-number"},"3"),a("], offset};")]),a(`
                `),s("span",{class:"custom-hl-bold"},[a("    issue_fifo_wdata.is_rvc = "),s("span",{class:"hljs-number"},"1"),a(";")]),a(`
                `),s("span",{class:"custom-hl-bold"},"    issue_fifo_wdata.bits   = rvcc_inst32;"),a(`
                `),s("span",{class:"custom-hl-bold"},[a("} "),s("span",{class:"hljs-keyword"},"else"),a(" {")]),a(`
                    `),s("span",{class:"hljs-comment"},"// Read next 8 bytes"),a(`
                `),s("span",{class:"custom-hl-bold"},"}"),a(`
            }
        } `),s("span",{class:"hljs-keyword"},"else"),a(` {
            fetch_fifo_rready     = `),s("span",{class:"custom-hl-bold"},"!rvcc_is_rvc &&"),a(" offset == "),s("span",{class:"hljs-number"},"4"),a(`;
            issue_fifo_wvalid     = `),s("span",{class:"hljs-number"},"1"),a(`;
            issue_fifo_wdata.addr = {raddr[`),s("span",{class:"hljs-keyword"},"msb"),a(":"),s("span",{class:"hljs-number"},"3"),a(`], offset};
            `),s("span",{class:"custom-hl-bold"},[s("span",{class:"hljs-keyword"},"if"),a(" rvcc_is_rvc {")]),a(`
            `),s("span",{class:"custom-hl-bold"},"    issue_fifo_wdata.bits = rvcc_inst32;"),a(`
            `),s("span",{class:"custom-hl-bold"},[a("} "),s("span",{class:"hljs-keyword"},"else"),a(" {")]),a(`
                issue_fifo_wdata.bits = `),s("span",{class:"hljs-keyword"},"case"),a(` offset {
                    `),s("span",{class:"hljs-number"},"0"),a("      : rdata["),s("span",{class:"hljs-number"},"31"),a(":"),s("span",{class:"hljs-number"},"0"),a(`],
                    `),s("span",{class:"hljs-number"},"2"),a("      : rdata["),s("span",{class:"hljs-number"},"47"),a(":"),s("span",{class:"hljs-number"},"16"),a(`],
                    `),s("span",{class:"hljs-number"},"4"),a("      : rdata["),s("span",{class:"hljs-number"},"63"),a(":"),s("span",{class:"hljs-number"},"32"),a(`],
                    `),s("span",{class:"hljs-keyword"},"default"),a(": "),s("span",{class:"hljs-number"},"0"),a(`,
                };
            `),s("span",{class:"custom-hl-bold"},"}"),a(`
            issue_fifo_wdata.is_rvc = `),s("span",{class:"custom-hl-bold"},"rvcc_is_rvc"),a(`;
        }
    }
}
`)])])],-1),n("",3)])])}const _=e(t,[["render",o]]);export{j as __pageData,_ as default};
