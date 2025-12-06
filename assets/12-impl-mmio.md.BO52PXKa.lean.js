import{_ as l,c as p,o as c,ah as n,j as s,a,bB as o}from"./chunks/framework.B0Vze7XN.js";const f=JSON.parse('{"title":"Memory-mapped I/Oの実装","description":"","frontmatter":{},"headers":[],"relativePath":"12-impl-mmio.md","filePath":"12-impl-mmio.md"}'),d={name:"12-impl-mmio.md"};function t(r,e,b,m,i,h){return c(),p("div",null,[...e[0]||(e[0]=[n("",11),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-comment"},[a("// メモリ"),s("span",{class:"custom-hl-bold"},"バス"),a("のデータ幅")]),a(`
`),s("span",{class:"hljs-keyword"},"const"),a(" MEM"),s("span",{class:"custom-hl-bold"},"BUS"),a("_DATA_WIDTH: "),s("span",{class:"hljs-keyword"},"u32"),a(" = "),s("span",{class:"hljs-number"},"64"),a(`;
`),s("span",{class:"custom-hl-del"},[s("span",{class:"hljs-comment"},"// メモリのアドレス幅")]),a(`
`),s("span",{class:"custom-hl-del"},[s("span",{class:"hljs-keyword"},"const"),a(" MEM_ADDR_WIDTH: "),s("span",{class:"hljs-keyword"},"u32"),a(" = "),s("span",{class:"hljs-number"},"16"),a(";")]),a(`

`),s("span",{class:"hljs-comment"},"// RAM"),a(`
`),s("span",{class:"hljs-keyword"},"const"),a(" RAM_ADDR_WIDTH: "),s("span",{class:"hljs-keyword"},"u32"),a("  = "),s("span",{class:"hljs-number"},"16"),a(`;
`),s("span",{class:"hljs-keyword"},"const"),a(" RAM_DATA_WIDTH: "),s("span",{class:"hljs-keyword"},"u32"),a("  = "),s("span",{class:"hljs-number"},"64"),a(`;
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[s("span",{class:"hljs-keyword"},"const"),a(" MMAP_RAM_BEGIN: Addr = "),s("span",{class:"hljs-number"},"'h8000_0000"),a(),s("span",{class:"hljs-keyword"},"as"),a(` Addr;

`),s("span",{class:"hljs-comment"},"// ROM"),a(`
`),s("span",{class:"hljs-keyword"},"const"),a(" ROM_ADDR_WIDTH: "),s("span",{class:"hljs-keyword"},"u32"),a("  = "),s("span",{class:"hljs-number"},"9"),a(`;
`),s("span",{class:"hljs-keyword"},"const"),a(" ROM_DATA_WIDTH: "),s("span",{class:"hljs-keyword"},"u32"),a("  = "),s("span",{class:"hljs-number"},"64"),a(`;
`)])]),s("span",{class:"hljs-keyword"},"const"),a(" MMAP_ROM_BEGIN: Addr = "),s("span",{class:"hljs-number"},"'h1000"),a(),s("span",{class:"hljs-keyword"},"as"),a(` Addr;
`),s("span",{class:"hljs-keyword"},"const"),a(" MMAP_ROM_END  : Addr = MMAP_ROM_BEGIN + "),s("span",{class:"hljs-number"},"'h3ff"),a(),s("span",{class:"hljs-keyword"},"as"),a(` Addr;
`)])])],-1),n("",99),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[a(`#[ifdef(TEST_MODE)]
`),s("span",{class:"hljs-keyword"},"always_ff"),a(` {
    `),s("span",{class:"hljs-keyword"},"let"),a(" RISCVTESTS_TOHOST_ADDR: Addr = "),s("span",{class:"custom-hl-bold"},"MMAP_RAM_BEGIN +"),a(),s("span",{class:"hljs-number"},"'h1000"),a(),s("span",{class:"hljs-keyword"},"as"),a(` Addr;
    `),s("span",{class:"hljs-keyword"},"if"),a(" d_membus.valid && d_membus.ready && d_membus.wen == "),s("span",{class:"hljs-number"},"1"),a(" && d_membus.addr == RISCVTESTS_TOHOST_ADDR && d_membus.wdata["),s("span",{class:"hljs-keyword"},"lsb"),a("] == "),s("span",{class:"hljs-number"},"1'b1"),a(` {
        test_success = d_membus.wdata == `),s("span",{class:"hljs-number"},"1"),a(`;
        `),s("span",{class:"hljs-keyword"},"if"),a(" d_membus.wdata == "),s("span",{class:"hljs-number"},"1"),a(` {
            $display(`),s("span",{class:"hljs-string"},'"riscv-tests success!"'),a(`);
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a("        } "),s("span",{class:"hljs-keyword"},"else"),a(` {
            $display(`),s("span",{class:"hljs-string"},'"riscv-tests failed!"'),a(`);
            $error  (`),s("span",{class:"hljs-string"},'"wdata : %h"'),a(`, d_membus.wdata);
        }
        $finish();
`)])]),a(`    }
}
`)])])],-1),n("",175),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"always_ff"),a(` {
    dbg_membus.ready  = `),s("span",{class:"hljs-number"},"1"),a(`;
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a(`    dbg_membus.rvalid = dbg_membus.valid;
    `),s("span",{class:"hljs-keyword"},"if"),a(` dbg_membus.valid {
        `),s("span",{class:"hljs-keyword"},"if"),a(` dbg_membus.wen {
            `),s("span",{class:"hljs-keyword"},"if"),a(" dbg_membus.wdata[MEMBUS_DATA_WIDTH - "),s("span",{class:"hljs-number"},"1"),a("-:"),s("span",{class:"hljs-number"},"20"),a("] == "),s("span",{class:"hljs-number"},"20'h01010"),a(` {
                $write(`),s("span",{class:"hljs-string"},'"%c"'),a(", dbg_membus.wdata["),s("span",{class:"hljs-number"},"7"),a(":"),s("span",{class:"hljs-number"},"0"),a(`]);
            } `),s("span",{class:"hljs-keyword"},"else"),a(),s("span",{class:"hljs-keyword"},"if"),a(" dbg_membus.wdata["),s("span",{class:"hljs-keyword"},"lsb"),a("] == "),s("span",{class:"hljs-number"},"1'b1"),a(` {
                #[ifdef(TEST_MODE)]
                {
                    test_success = dbg_membus.wdata == `),s("span",{class:"hljs-number"},"1"),a(`;
                }
                `),s("span",{class:"hljs-keyword"},"if"),a(" dbg_membus.wdata == "),s("span",{class:"hljs-number"},"1"),a(` {
                    $display(`),s("span",{class:"hljs-string"},'"test success!"'),a(`);
                } `),s("span",{class:"hljs-keyword"},"else"),a(` {
                    $display(`),s("span",{class:"hljs-string"},'"test failed!"'),a(`);
`)])]),a("                    $error  ("),s("span",{class:"hljs-string"},'"wdata : %h"'),a(`, dbg_membus.wdata);
                }
                $finish();
            }
        `),s("span",{class:"custom-hl-bold"},[a("} "),s("span",{class:"hljs-keyword"},"else"),a(" {")]),a(`
        `),s("span",{class:"custom-hl-bold"},"    #[ifdef(ENABLE_DEBUG_INPUT)]"),a(`
        `),s("span",{class:"custom-hl-bold"},"    {"),a(`
        `),s("span",{class:"custom-hl-bold"},"        dbg_membus.rdata = util::get_input();"),a(`
        `),s("span",{class:"custom-hl-bold"},"    }"),a(`
        }
    }
}
`)])])],-1),n("",10)])])}const _=l(d,[["render",t]]);export{f as __pageData,_ as default};
