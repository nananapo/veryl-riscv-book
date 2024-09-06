# -*- coding: utf-8 -*-

##
## Markdownへ変換する
##

require_relative './review-builder'


module ReVIEW


  class MarkdownBuilder < Builder

    def target_name
      "markdown"
    end

    def extname
      ".md"
    end

    def headline(level, label, caption)
      blank2() unless @output.pos == 0
      print "#{'#' * level} "
      print compile_inline(caption||'')
      #print " {##{label}}" if label
      puts ""
      blank()
    end

    def notoc_begin(level, label, caption)
      blank2() unless @output.pos == 0
      print "#{'#' * level} "
      print compile_inline(caption||'')
      #print " {##{label}}" if label
      puts ""
      blank()
    end

    def notoc_end(level)
    end

    def column_begin(level, label, caption)
      blank2()
      puts "[column] #{compile_inline(caption||'')}"
    end

    def column_end(_level)
      truncate_blank()
      puts "[/column]"
      blank2()
    end

    def blank()
      puts "" unless @output.string.end_with?("\n\n")
    end

    def blank2()
      if @output.string.end_with?("\n\n\n")
      elsif @output.string.end_with?("\n\n")
        puts ""
      else
        puts ""
        puts ""
      end
    end

    def twospaces()
      if truncate_if_endwith?("\n")
        puts "  "
        return true
      else
        false
      end
    end

    def nofunc_text(str)
      if within_codeblock?() || within_context?(:code)
        str
      else
        escape(str)
      end
    end

    def escape(str)
      str.to_s.gsub(/[&<>"']/, HTML_ESCAPE_TABLE)
    end

    HTML_ESCAPE_TABLE = {
      '&' => '&amp;',
      '<' => '&lt;',
      '>' => '&gt;',
      '"' => '&quot;',
      "'" => '&#039;',
    }

    ## 画像

    def indepimage(lines, id, caption='', metric=nil)
      image = @chapter.image(id)
      image.bound?  or
        error "//image[#{id}]: image not found."
      image_filepath = image.path
      blank()
      puts "![#{compile_inline(caption||'')}](#{image_filepath})"
      if caption.present?
        puts "<span class=\"caption\">▲#{compile_inline(caption)}</span>"
      end
      blank()
    end

    def imgtable_image(id, caption, metric)
      metrics = parse_metric('html', metric)
      puts "<img src=\"#{@chapter.image(id).path.sub(%r{\A\./}, '')}\"#{metrics} />"
    end

    protected

    def _render_image(id, image_filepath, caption, opts)
      puts "![#{compile_inline(caption||'')}](#{image_filepath})"
    end

    ## コードブロック（//program, //terminal, //output）

    def _render_codeblock(blockname, lines, id, caption_str, opts)
      blank()
      if caption_str.present?
        puts "<span class=\"caption\">▼#{compile_inline(caption_str)}</span>"
        puts ""
      end
      lang = opts['lang']
      lang ||= 'terminal' if blockname == 'terminal' || blockname == 'cmd'
      puts "```#{lang}"
      lines.each do |line|
        puts compile_inline(line)
      end
      puts "```"
      blank()
    end

    def _add_indent_mark(lines, indent_width)
      space = " "
      rexp  = /\A( +)/
      #
      width = indent_width
      mark  = _codeblock_indentmark()  # ex: '{\starterindentmark}'
      indent = space * (width - 1) + mark
      nchar = space.length
      return lines.map {|line|
        line.sub(rexp) {
          m, n = ($1.length / nchar - 1).divmod width
          "#{space}#{indent * m}#{space * n}"
        }
      }
    end

    public

    def list(lines, id=nil, caption=nil, lang=nil)
      _codeblock("list", lines, id, caption, _codeblock_optstr(lang, false))
    end
    def listnum(lines, id=nil, caption=nil, lang=nil)
      _codeblock("listnum", lines, id, caption, _codeblock_optstr(lang, true))
    end
    def emlist(lines, caption=nil, lang=nil)
      _codeblock("emlist", lines, nil, caption, _codeblock_optstr(lang, false))
    end
    def emlistnum(lines, caption=nil, lang=nil)
      _codeblock("emlistnum", lines, nil, caption, _codeblock_optstr(lang, true))
    end
    def source(lines, caption=nil, lang=nil)
      _codeblock("source", lines, nil, caption, _codeblock_optstr(lang, false))
    end
    def cmd(lines, caption=nil, lang=nil)
      lang ||= "shell-session"
      _codeblock("cmd", lines, nil, caption, _codeblock_optstr(lang, false))
    end
    def _codeblock_optstr(lang, lineno_flag)
      arr = []
      arr << lang if lang
      if lineno_flag
        first_line_num = line_num()
        arr << "lineno=#{first_line_num}"
        arr << "linenowidth=0"
      end
      return arr.join(",")
    end
    private :_codeblock_optstr

    protected

    ## @<secref>{}

    def _build_secref(chap, num, title, parent_title)
      s = ""
      ## 親セクションのタイトルがあれば使う
      if parent_title
        s << "「%s」内の" % parent_title   # TODO: I18n化
      end
      ## 対象セクションへのリンクを作成する
      if @book.config['chapterlink']
        filename = "#{chap.id}#{extname()}"
        s << "[「#{title}」](#{filename})"
      else
        s << "「#{title}」"
      end
      return s
    end

    public

    def ul_begin()
      n = _enter_ul()
      blank() if n == 1
    end

    def ul_end()
      n = _exit_ul()
      blank() if n == 1
    end

    def ul_item(lines)
      n = _depth_ul()
      sp = nil
      lines.each do |line|
        if !sp
          puts "#{'  ' * (n-1)}* #{line.strip}"
          sp = '  ' * n
        else
          puts "#{sp}#{line.strip}"
        end
      end
    end

    def _enter_ul
      @_ul_depth ||= 0
      @_ul_depth += 1
      return @_ul_depth
    end

    def _exit_ul
      n = @_ul_depth
      @_ul_depth -= 1
      return n
    end

    def _depth_ul
      return @_ul_depth
    end

    ## 順序つきリスト

    def ol_begin(start_num=nil)
      @_ol_types ||= []    # stack
      case start_num
      when nil
        type = "1"; start = 1
      when /\A(\d+)\.\z/
        type = "1"; start = $1.to_i
      when /\A([A-Z])\.\z/
        type = "A"; start = $1.ord - 'A'.ord + 1
      when /\A([a-z])\.\z/
        type = "a"; start = $1.ord - 'a'.ord + 1
      else
        type = nil; start = nil
      end
      @_ol_types.push(type)
      blank() if @_ol_types.length == 1
    end

    def ol_end()
      blank() if @_ol_types.length == 1
      ol = !! @_ol_types.pop()
      _ = ol
    end

    def ol_item(lines, num)
      n = @_ol_types.length
      sp = nil
      lines.each do |line|
        if !sp
          #s = num.length == 1 ? '.  ' : '. '
          #puts "#{num}#{s}#{line.strip}"
          #sp = '    ' * n
          puts "#{num}. #{line.strip}"
          sp = ' ' * "#{num}. ".length
        else
          puts "#{sp}#{line.strip}"
        end
      end
    end

    def ol_item_begin(lines, num)
      n = @_ol_types.length
      sp = nil
      lines.each do |line|
        if !sp
          puts "#{'    ' * (n-1)}- #{num} #{line.strip}"
          sp = '    ' * n
        else
          puts "#{sp}#{line.strip}"
        end
      end
    end

    def ol_item_end()
    end

    def dl_begin()
      blank()
      puts "<dl>"
    end

    def dl_end()
      puts "</dl>"
      blank()
    end

    def dt(word)
      #puts word
      #puts "#{word}::"
      puts "<dt>#{word}</dt>"
    end

    def dl_dd_begin()
      puts "<dd>"
    end

    def dl_dd_end()
      puts "</dd>"
    end

    ## 画像横に文章
    def _render_sideimage(filepath, imagewidth, opts, &b)
      blank()
      puts "<img src=\"#{filepath}\">"
      blank()
      yield
    end

    ## 入れ子可能なブロック命令

    def on_minicolumn(type, caption=nil, &b)
      ## ・タイトルと1つ目の文の間に空行がないと、
      ##   textlintにタイトルも含めた1つの文だと認識されてしまい、
      ##   「一文が長すぎる」というエラーが頻発する。
      ## ・タイトルには末尾に「。」がないので、そのままだと
      ##   「文末に「。」がない」というエラーが頻発する。
      ## ・タイトルを <b></b> で囲むとこのエラーだけが出なくなる。
      ##   （他のエラーは出るまま。）
      with_context(:minicolumn) do
        blank2()
        puts "[#{type}] <b>#{compile_inline(caption||'')}</a>"
        blank()
        yield
        blank()
        puts "[/#{type}]"
        blank2()
      end
    end
    protected :on_minicolumn

    def paragraph(lines)
      lines.each do |line|
        puts line
      end
      blank()
    end

    #### ブロック命令

    def footnote(id, str)
      @_fn_count  ||= 0
      @_fn_labels ||= {}
      n = @_fn_labels[id]
      blank()   # necessary?
      puts "[^#{n || 9999}]: #{compile_inline(str||'')}"
      blank()   # necessary?
    end

    def texequation(lines, label=nil, caption=nil)
      blank()
      puts "```math"
      puts lines
      puts "```"
      blank()
    end

    ## 章 (Chapter) の概要
    def on_abstract_block()
      blank()
      puts "[abstract]"; twospaces()
      yield
      truncate_blank(); twospaces()
      puts "[/abstract]"
      blank()
    end

    ## 章 (Chapter) の著者
    def on_chapterauthor_block(name)
      puts "（著：#{name}）"
      blank()
    end

    ## 会話リスト
    def _render_talklist(opts, &b)
      blank()
      yield
      blank()
    end

    ## 会話項目
    def on_talk_block(imagefile, name=nil, text=nil, &b)
      if imagefile.present?
        find_image_filepath(imagefile)  or
          error "//talk[#{imagefile}]: image file not found."
        print "* [#{imagefile}] "
      elsif name
        print "* [#{name}] "
      else
        print "* "
      end
      if text.nil?
        yield
      else
        puts compile_inline(text||'')
      end
    end

    ## キーと説明文のリスト
    def _render_desclist(opts, &b)
      blank()
      bkup = @_desclist_opts
      @_desclist_opts = opts
      yield
      @_desclist_opts = bkup
      blank()
    end

    ## キーと説明文
    def _render_desc(key, &b)
      opts = @_desclist_opts
      puts "#{compile_inline(key)}:: "
      yield
    end

    ## 縦方向の空きを入れる
    def _render_vspace(size)
      blank()
    end

    ## 章タイトルを独立したページに
    def makechaptitlepage(option=nil)
      blank()
      puts ''
    end

    ## 縦方向のスペースがなければ改ページ
    def _render_needvspace(height)
      blank()
      puts ''
    end

    ## 段(Paragraph)の終わりにスペースを入れる
    def paragraphend()
      blank()
    end

    ## 小段(Subparagraph)の終わりにスペースを入れる（あれば）
    def subparagraphend()
      blank()
    end

    ## 引用（複数段落に対応）
    def blockquote(lines)
      blank()
      puts "[quote]"; twospaces()
      puts lines
      truncate_blank(); twospaces()
      puts "[/quote]"
      blank()
    end

    ## 引用（//quote{ ... //}）
    ## （入れ子対応なので、中に箇条書きや別のブロックを入れられる）
    def on_quote_block()
      blank()
      puts "[quote]"; twospaces()
      yield
      truncate_blank(); twospaces()
      puts "[/quote]"
      blank()
    end
    def quote(lines)
      on_quote_block() do
        puts lines
      end
    end

    ## 引用 (====[quote] ... ====[/quote])
    ## （ブロック構文ではないので、中に別のブロックや箇条書きを入れられる）
    def quote_begin(level, label, caption)
      blank()
    end
    def quote_end(level)
      blank()
    end

    ## ノート（//note{ ... //}）
    ## （入れ子対応なので、中に箇条書きや別のブロックを入れられる）
    def on_note_block(label=nil, caption=nil)
      ## ・ノートのタイトルと1つ目の文の間に空行がないと、
      ##   textlintにタイトルも含めた1つの文だと認識されてしまい、
      ##   「一文が長すぎる」というエラーが頻発する。
      ## ・ノートのタイトルには末尾に「。」がないので、そのままだと
      ##   「文末に「。」がない」というエラーが頻発する。
      ## ・タイトルを <b></b> で囲むとこのエラーだけが出なくなる。
      ##   （他のエラーは出るまま。）
      with_context(:minicolumn) do
        blank2()
        caption, label = label, nil if caption.nil?
        puts "[note] <b>#{compile_inline(caption||'')}</a>"
        blank()
        yield
        blank()
        puts "[/note]"
        blank2()
      end
    end
    def note(lines, label=nil, caption=nil)
      on_quote_block(label, caption) do
        puts lines
      end
    end

    ## ノート (====[note] ... ====[/note])
    ## （ブロック構文ではないので、中に別のブロックや箇条書きを入れられる）
    def note_begin(level, label, caption)
      blank()
      puts "[note] #{compile_inline(caption||'')}"; twospaces()
    end
    def note_end(level)
      truncate_blank(); twospaces()
      puts "[/note]"
      blank()
    end

    ## テーブル
    def table(lines, id=nil, caption=nil, option=nil)
      super
    end

    def table_header(id, caption, options)
      if id.present?
        begin
          num = @chapter.table(id).number
        rescue KeyError
          error "no such table: #{id}"
        end
        s1 = I18n.t('table')
        s2 = get_chap() \
           ? I18n.t('format_number_header', [get_chap(), num]) \
           : I18n.t('format_number_header_without_chapter', [num])
        s3 = I18n.t('caption_prefix')
        puts "<p class=\"caption\">#{s1}#{s2}#{s3}#{compile_inline(caption||'')}</p>"
      elsif caption.present?
        puts "<p class=\"caption\">#{compile_inline(caption||'')}</p>"
      end
    end

    def table_begin(_ncols, fontsize: nil)
      if fontsize
        puts "<table style=\"font-size:#{fontsize}\">"
      else
        puts "<table>"
      end
    end

    def table_end
      puts "</table>"
    end

    def th(s)
      "<th>#{s}</th>"
    end

    def td(s)
      "<td>#{s}</td>"
    end

    protected

    def normalize_id(id)
      id
    end

    def _table_before(id, caption, opts)
      class_ = opts[:csv] ? "table table-nohline" : "table"
      if id.present?
        puts "<div id=\"#{normalize_id(id)}\" class=\"#{class_}\">"
      else
        puts "<div class=\"#{class_}\">"
      end
    end

    def _table_after(id, caption, opts)
      puts "</div>"
    end

    def _table_bottom(hline: false)
    end

    def _table_tr(cells, hline: false)
      if hline
        "<tr class=\"hline\">#{cells.join}</tr>"
      else
        "<tr>#{cells.join}</tr>"
      end
    end

    public

    ## //imgtable
    def imgtable(lines, id, caption=nil, option=nil)
      super
    end

    protected

    def _render_imgtable(id, caption, opts)
      puts "<div id=\"#{normalize_id(id)}\" class=\"imgtable image\">"
      table_header(id, caption, opts)
      puts "  <div>"
      yield
      puts "  </div>"
      puts "</div>"
    end

    def _render_imgtable_caption(caption)
    end

    def _render_imgtable_label(id)
    end

    public

    #### インライン命令

    def inline_fn(id)
      @_fn_count  ||= 0
      @_fn_labels ||= {}
      n = (@_fn_count += 1)
      @_fn_labels[id] = n
      return "[^#{n}]"
    end

    ## 改段落（箇条書き内では空行を入れられないため）
    def inline_par(arg)
      #blank()
      "<br>"
    end

    ## ファイル名
    def inline_file(str)
      "`#{str}`"
    end
    def on_inline_file
      "`#{yield}`"
    end

    ## ユーザ入力
    def inline_userinput(str)
      str
    end
    def on_inline_userinput
      yield
    end

    ## 引数をそのまま表示 (No Operation)
    def inline_nop(str)
      str || ""
    end
    alias inline_letitgo inline_nop

    ## 目立たせない（@<strong>{} の反対）
    def inline_weak(str)
      str
    end
    def on_inline_weak
      yield
    end

    ## 文字を小さくする
    def inline_small(str);   str; end
    def inline_xsmall(str);  str; end
    def inline_xxsmall(str); str; end
    def on_inline_small();   yield; end
    def on_inline_xsmall();  yield; end
    def on_inline_xxsmall(); yield; end

    ## 文字を大きくする
    def inline_large(str);   str; end
    def inline_xlarge(str);  str; end
    def inline_xxlarge(str); str; end
    def on_inline_large();   yield; end
    def on_inline_xlarge();  yield; end
    def on_inline_xxlarge(); yield; end

    ## 文字を大きくした@<strong>{}
    def inline_strong(str);   str; end
    def inline_xstrong(str);  str; end
    def inline_xxstrong(str); str; end
    def on_inline_strong();   yield; end
    def on_inline_xstrong();  yield; end
    def on_inline_xxstrong(); yield; end

    ## コードブロック中で折り返し箇所を手動で指定する
    def inline_foldhere(arg)
      ""
    end

    ## ターミナルでのカーソル（背景が白、文字が黒）
    def inline_cursor(str)
      "[#{str}]"
    end

    ## nestable inline commands

    def on_inline_i()     ; "*#{yield}*"           ; end
    #def on_inline_b()     ; "**#{yield}**"           ; end
    #def on_inline_code()  ; "`#{yield}`"     ; end
    def on_inline_tt()    ; "<tt>#{yield}</tt>"         ; end
    def on_inline_del()   ; "~~#{yield}~~"              ; end
    def on_inline_sub()   ; "<sub>#{yield}</sub>"       ; end
    def on_inline_sup()   ; "<sup>#{yield}</sup>"       ; end
    def on_inline_em()    ; "<em>#{yield}</em>"         ; end
    def on_inline_strong(); "**#{yield}**" ; end
    def on_inline_u()     ; "<u>#{yield}</u>"           ; end
    def on_inline_ami()   ; "<span class=\"ami\">#{yield}</span>"; end
    def on_inline_balloon(); "← #{yield}"; end

    def on_inline_b()
      if within_codeblock?()
        #"<b>#{yield}</b>"
        yield
      else
        "**#{yield}**"
      end
    end

    def on_inline_code()
      with_context(:code) do
        return "`#{yield}`"
      end
    end

    ## 「“」と「”」で囲む
    def on_inline_qq()
      "“#{yield}”"
    end

    def build_inline_href(url, escaped_label)  # compile_href()をベースに改造
      if escaped_label.present?
        "[#{escaped_label}](#{url})"
      else
        url
      end
    end

    def inline_hlink(str)
      url, label = str.split(/, /, 2)
      flag_link = @book.config['externallink']
      return _inline_hyperlink(url, escape(label), flag_link)
    end

    def _inline_hyperlink(url, escaped_label, flag_link)
      if flag_link
        label = escaped_label || url
        "<a href=\"#{url}\">#{label}</a>"
      elsif escaped_label
        I18n.t('external_link', [escaped_label, url])
      else
        escape_html(url)
      end
    end
    private :_inline_hyperlink

    def build_inline_ruby(escaped_word, escaped_yomi)  # compile_ruby()をベースに改造
      "#{escaped_word}（#{escaped_yomi}）"
    end

    protected

    ## ノートを参照する
    def build_noteref(chapter, label, caption)
      "ノート「#{compile_inline(caption||'')}」"
    end

    ## 数式を参照する
    def build_eq(chapter, label, number)
      s = "#{I18n.t('equation')}#{chapter.number}.#{number}"
      "<a>#{escape(s)}</a>"
    end

    public

    ##########

    def noindent()
    end

    def clearpage
      blank2()
    end

    def on_flushright_block()
      blank()
      puts "[flushright]"; twospaces()
      yield
      truncate_blank(); twospaces()
      puts "[/flushright]"
      blank()
    end

    def on_centering_block()
      blank()
      puts "[centering]"; twospaces()
      yield
      truncate_blank(); twospaces()
      puts "[/centering]"
      blank()
    end

    def on_center_block()
      blank()
      puts "[center]"; twospaces()
      yield
      truncate_blank(); twospaces()
      puts "[/center]"
      blank()
    end

    def on_textleft_block()
      blank()
      puts "[textleft]"; twospaces()
      yield
      truncate_blank(); twospaces()
      puts "[/textleft]"
      blank()
    end

    def on_textright_block()
      blank()
      puts "[textright]"; twospaces()
      yield
      truncate_blank(); twospaces()
      puts "[/textright]"
      blank()
    end

    def on_textcenter_block()
      blank()
      puts "[textcenter]"; twospaces()
      yield
      truncate_blank(); twospaces()
      puts "[/textcenter]"
      blank()
    end

    def sampleoutputbegin(caption=nil)
      blank()
      if caption.present?
        puts "<span class=\"caption\">▽#{compile_inline(caption)}</span>"
        blank()
      end
      puts "----------------------------------------"
      blank()
    end

    def sampleoutputend()
      blank()
      puts "----------------------------------------"
      blank()
    end


    def on_inline_B()
      "**#{yield}**"
    end

    def inline_br(_)
      "<br>"
    end

    def inline_clearpage(_)
      blank2()
    end

    def inline_m(str)
      "$#{str}$"
    end

    def inline_icon(imagefile)
      filepath = find_image_filepath(imagefile)
      "<img src=\"#{filepath}\">"
    end

    def inline_par(arg)
      "\n\n"
    end

    def inline_hd_chap(chap, id)
      n = chap.headline_index.number(id)
      if chap.number and @book.config['secnolevel'] >= n.split('.').size
        str = I18n.t('chapter_quote', "#{n} #{compile_inline(chap.headline(id).caption)}")
      else
        str = I18n.t('chapter_quote', compile_inline(chap.headline(id).caption))
      end
      if @book.config['chapterlink']
        anchor = 'h' + n.gsub('.', '-')
        %Q(<a href="#{chap.id}#{extname}##{anchor}">#{str}</a>)
      else
        str
      end
    rescue KeyError
      error "unknown headline: #{id}"
    end

    def inline_TeX(_)
      "TeX"
    end

    def inline_LaTeX(_)
      "LaTeX"
    end

    def inline_hearts(_)
      ":heart:"
    end

  end


end
