# -*- coding: utf-8 -*-

###
### ReVIEW::Compilerクラスとその関連クラスを拡張する
###

require 'set'
require 'review/compiler'


module ReVIEW

  defined?(Compiler)  or raise "internal error: Compiler not found."


  class Compiler

    #------------------------------ original code

=begin

    def initialize(strategy)
      @strategy = strategy
    end

    attr_reader :strategy

    def compile(chap)
      @chapter = chap
      do_compile
      @strategy.result
    end

    class SyntaxElement
      def initialize(name, type, argc, &block)
        @name = name
        @type = type
        @argc_spec = argc
        @checker = block
      end

      attr_reader :name

      def check_args(args)
        unless @argc_spec === args.size
          raise CompileError, "wrong # of parameters (block command //#{@name}, expect #{@argc_spec} but #{args.size})"
        end
        if @checker
          @checker.call(*args)
        end
      end

      def min_argc
        case @argc_spec
        when Range then @argc_spec.begin
        when Integer then @argc_spec
        else
          raise TypeError, "argc_spec is not Range/Integer: #{inspect}"
        end
      end

      def block_required?
        @type == :block
      end

      def block_allowed?
        @type == :block or @type == :optional
      end
    end

    SYNTAX = {}

    def self.defblock(name, argc, optional = false, &block)
      defsyntax name, (optional ? :optional : :block), argc, &block
    end

    def self.defsingle(name, argc, &block)
      defsyntax name, :line, argc, &block
    end

    def self.defsyntax(name, type, argc, &block)
      SYNTAX[name] = SyntaxElement.new(name, type, argc, &block)
    end

    def self.definline(name)
      INLINE[name] = InlineSyntaxElement.new(name)
    end

    def syntax_defined?(name)
      SYNTAX.key?(name.to_sym)
    end

    def syntax_descriptor(name)
      SYNTAX[name.to_sym]
    end

    class InlineSyntaxElement
      def initialize(name)
        @name = name
      end

      attr_reader :name
    end

    INLINE = {}

    def inline_defined?(name)
      INLINE.key?(name.to_sym)
    end

    defblock :read, 0
    defblock :lead, 0
    defblock :list, 2..3
    defblock :emlist, 0..2
    defblock :cmd, 0..1
    defblock :table, 0..2
    defblock :imgtable, 0..2
    defblock :emtable, 0..1
    defblock :quote, 0
    defblock :image, 2..3, true
    defblock :source, 0..2
    defblock :listnum, 2..3
    defblock :emlistnum, 0..2
    defblock :bibpaper, 2..3, true
    defblock :doorquote, 1
    defblock :talk, 0
    defblock :texequation, 0
    defblock :graph, 1..3
    defblock :indepimage, 1..3, true
    defblock :numberlessimage, 1..3, true

    defblock :address, 0
    defblock :blockquote, 0
    defblock :bpo, 0
    defblock :flushright, 0
    defblock :centering, 0
    defblock :note, 0..1
    defblock :memo, 0..1
    defblock :info, 0..1
    defblock :important, 0..1
    defblock :caution, 0..1
    defblock :notice, 0..1
    defblock :warning, 0..1
    defblock :tip, 0..1
    defblock :box, 0..1
    defblock :comment, 0..1, true
    defblock :embed, 0..1

    defsingle :footnote, 2
    defsingle :noindent, 0
    defsingle :blankline, 0
    defsingle :pagebreak, 0
    defsingle :hr, 0
    defsingle :parasep, 0
    defsingle :label, 1
    defsingle :raw, 1
    defsingle :tsize, 1
    defsingle :include, 1
    defsingle :olnum, 1
    defsingle :firstlinenum, 1

    definline :chapref
    definline :chap
    definline :title
    definline :img
    definline :imgref
    definline :icon
    definline :list
    definline :table
    definline :fn
    definline :kw
    definline :ruby
    definline :bou
    definline :ami
    definline :b
    definline :dtp
    definline :code
    definline :bib
    definline :hd
    definline :href
    definline :recipe
    definline :column
    definline :tcy

    definline :abbr
    definline :acronym
    definline :cite
    definline :dfn
    definline :em
    definline :kbd
    definline :q
    definline :samp
    definline :strong
    definline :var
    definline :big
    definline :small
    definline :del
    definline :ins
    definline :sup
    definline :sub
    definline :tt
    definline :i
    definline :tti
    definline :ttb
    definline :u
    definline :raw
    definline :br
    definline :m
    definline :uchar
    definline :idx
    definline :hidx
    definline :comment
    definline :include
    definline :tcy
    definline :embed
    definline :pageref

    private

    def do_compile
      f = LineInput.new(StringIO.new(@chapter.content))
      @strategy.bind self, @chapter, Location.new(@chapter.basename, f)
      tagged_section_init
      while f.next?
        case f.peek
        when /\A\#@/
          f.gets # Nothing to do
        when /\A=+[\[\s\{]/
          compile_headline f.gets
        when /\A\s+\*/
          compile_ulist f
        when /\A\s+\d+\./
          compile_olist f
        when /\A\s*:\s/
          compile_dlist f
        when %r{\A//\}}
          f.gets
          error 'block end seen but not opened'
        when %r{\A//[a-z]+}
          name, args, lines = read_command(f)
          syntax = syntax_descriptor(name)
          unless syntax
            error "unknown command: //#{name}"
            compile_unknown_command args, lines
            next
          end
          compile_command syntax, args, lines
        when %r{\A//}
          line = f.gets
          warn "`//' seen but is not valid command: #{line.strip.inspect}"
          if block_open?(line)
            warn 'skipping block...'
            read_block(f, false)
          end
        else
          if f.peek.strip.empty?
            f.gets
            next
          end
          compile_paragraph f
        end
      end
      close_all_tagged_section
    end

    def compile_headline(line)
      @headline_indexs ||= [@chapter.number.to_i - 1]
      m = /\A(=+)(?:\[(.+?)\])?(?:\{(.+?)\})?(.*)/.match(line)
      level = m[1].size
      tag = m[2]
      label = m[3]
      caption = m[4].strip
      index = level - 1
      if tag
        if tag !~ %r{\A/}
          if caption.empty?
            warn 'headline is empty.'
          end
          close_current_tagged_section(level)
          open_tagged_section(tag, level, label, caption)
        else
          open_tag = tag[1..-1]
          prev_tag_info = @tagged_section.pop
          if prev_tag_info.nil? || prev_tag_info.first != open_tag
            error "#{open_tag} is not opened."
          end
          close_tagged_section(*prev_tag_info)
        end
      else
        if caption.empty?
          warn 'headline is empty.'
        end
        if @headline_indexs.size > (index + 1)
          @headline_indexs = @headline_indexs[0..index]
        end
        if @headline_indexs[index].nil?
          @headline_indexs[index] = 0
        end
        @headline_indexs[index] += 1
        close_current_tagged_section(level)
        @strategy.headline level, label, caption
      end
    end

    def close_current_tagged_section(level)
      while @tagged_section.last and @tagged_section.last[1] >= level
        close_tagged_section(* @tagged_section.pop)
      end
    end

    def headline(level, label, caption)
      @strategy.headline level, label, caption
    end

    def tagged_section_init
      @tagged_section = []
    end

    def open_tagged_section(tag, level, label, caption)
      mid = "#{tag}_begin"
      unless @strategy.respond_to?(mid)
        error "strategy does not support tagged section: #{tag}"
        headline level, label, caption
        return
      end
      @tagged_section.push [tag, level]
      @strategy.__send__ mid, level, label, caption
    end

    def close_tagged_section(tag, level)
      mid = "#{tag}_end"
      if @strategy.respond_to?(mid)
        @strategy.__send__ mid, level
      else
        error "strategy does not support block op: #{mid}"
      end
    end

    def close_all_tagged_section
      until @tagged_section.empty?
        close_tagged_section(* @tagged_section.pop)
      end
    end

    def compile_ulist(f)
      level = 0
      f.while_match(/\A\s+\*|\A\#@/) do |line|
        next if line =~ /\A\#@/

        buf = [text(line.sub(/\*+/, '').strip)]
        f.while_match(/\A\s+(?!\*)\S/) do |cont|
          buf.push text(cont.strip)
        end

        line =~ /\A\s+(\*+)/
        current_level = $1.size
        if level == current_level
          @strategy.ul_item_end
          # body
          @strategy.ul_item_begin buf
        elsif level < current_level # down
          level_diff = current_level - level
          level = current_level
          (1..(level_diff - 1)).to_a.reverse_each do |i|
            @strategy.ul_begin { i }
            @strategy.ul_item_begin []
          end
          @strategy.ul_begin { level }
          @strategy.ul_item_begin buf
        elsif level > current_level # up
          level_diff = level - current_level
          level = current_level
          (1..level_diff).to_a.reverse_each do |i|
            @strategy.ul_item_end
            @strategy.ul_end { level + i }
          end
          @strategy.ul_item_end
          # body
          @strategy.ul_item_begin buf
        end
      end

      (1..level).to_a.reverse_each do |i|
        @strategy.ul_item_end
        @strategy.ul_end { i }
      end
    end

    def compile_olist(f)
      @strategy.ol_begin
      f.while_match(/\A\s+\d+\.|\A\#@/) do |line|
        next if line =~ /\A\#@/

        num = line.match(/(\d+)\./)[1]
        buf = [text(line.sub(/\d+\./, '').strip)]
        f.while_match(/\A\s+(?!\d+\.)\S/) do |cont|
          buf.push text(cont.strip)
        end
        @strategy.ol_item buf, num
      end
      @strategy.ol_end
    end

    def compile_dlist(f)
      @strategy.dl_begin
      while /\A\s*:/ =~ f.peek
        @strategy.dt text(f.gets.sub(/\A\s*:/, '').strip)
        desc = f.break(/\A(\S|\s*:|\s+\d+\.\s|\s+\*\s)/).map { |line| text(line.strip) }
        @strategy.dd(desc)
        f.skip_blank_lines
        f.skip_comment_lines
      end
      @strategy.dl_end
    end

    def compile_paragraph(f)
      buf = []
      f.until_match(%r{\A//|\A\#@}) do |line|
        break if line.strip.empty?
        buf.push text(line.sub(/^(\t+)\s*/) { |m| '<!ESCAPETAB!>' * m.size }.strip.gsub('<!ESCAPETAB!>', "\t"))
      end
      @strategy.paragraph buf
    end

    def read_command(f)
      line = f.gets
      name = line.slice(/[a-z]+/).to_sym
      ignore_inline = (name == :embed)
      args = parse_args(line.sub(%r{\A//[a-z]+}, '').rstrip.chomp('{'), name)
      @strategy.doc_status[name] = true
      lines = block_open?(line) ? read_block(f, ignore_inline) : nil
      @strategy.doc_status[name] = nil
      [name, args, lines]
    end

    def block_open?(line)
      line.rstrip[-1, 1] == '{'
    end

    def read_block(f, ignore_inline)
      head = f.lineno
      buf = []
      f.until_match(%r{\A//\}}) do |line|
        if ignore_inline
          buf.push line
        elsif line !~ /\A\#@/
          buf.push text(line.rstrip)
        end
      end
      unless %r{\A//\}} =~ f.peek
        error "unexpected EOF (block begins at: #{head})"
        return buf
      end
      f.gets # discard terminator
      buf
    end

    def parse_args(str, _name = nil)
      return [] if str.empty?
      scanner = StringScanner.new(str)
      words = []
      while word = scanner.scan(/(\[\]|\[.*?[^\\]\])/)
        w2 = word[1..-2].gsub(/\\(.)/) do
          ch = $1
          (ch == ']' or ch == '\\') ? ch : '\\' + ch
        end
        words << w2
      end
      unless scanner.eos?
        error "argument syntax error: #{scanner.rest} in #{str.inspect}"
        return []
      end
      words
    end

    def compile_command(syntax, args, lines)
      unless @strategy.respond_to?(syntax.name)
        error "strategy does not support command: //#{syntax.name}"
        compile_unknown_command args, lines
        return
      end
      begin
        syntax.check_args args
      rescue CompileError => err
        error err.message
        args = ['(NoArgument)'] * syntax.min_argc
      end
      if syntax.block_allowed?
        compile_block syntax, args, lines
      else
        if lines
          error "block is not allowed for command //#{syntax.name}; ignore"
        end
        compile_single syntax, args
      end
    end

    def compile_unknown_command(args, lines)
      @strategy.unknown_command args, lines
    end

    def compile_block(syntax, args, lines)
      @strategy.__send__(syntax.name, (lines || default_block(syntax)), *args)
    end

    def default_block(syntax)
      if syntax.block_required?
        error "block is required for //#{syntax.name}; use empty block"
      end
      []
    end

    def compile_single(syntax, args)
      @strategy.__send__(syntax.name, *args)
    end

    def replace_fence(str)
      str.gsub(/@<(\w+)>([$|])(.+?)(\2)/) do
        op = $1
        arg = $3.gsub('@', "\x01").gsub('\\}') { '\\\\}' }.gsub('}') { '\}' }.sub(/(?:\\)+$/) { |m| '\\\\' * m.size }
        "@<#{op}>{#{arg}}"
      end
    end

    def text(str)
      return '' if str.empty?
      words = replace_fence(str).split(/(@<\w+>\{(?:[^\}\\]|\\.)*?\})/, -1)
      words.each do |w|
        if w.scan(/@<\w+>/).size > 1 && !/\A@<raw>/.match(w)
          error "`@<xxx>' seen but is not valid inline op: #{w}"
        end
      end
      result = @strategy.nofunc_text(words.shift)
      until words.empty?
        result << compile_inline(words.shift.gsub(/\\\}/, '}').gsub(/\\\\/, '\\'))
        result << @strategy.nofunc_text(words.shift)
      end
      result.gsub("\x01", '@')
    rescue => err
      error err.message
    end
    public :text # called from strategy

    def compile_inline(str)
      op, arg = /\A@<(\w+)>\{(.*?)\}\z/.match(str).captures
      unless inline_defined?(op)
        raise CompileError, "no such inline op: #{op}"
      end
      unless @strategy.respond_to?("inline_#{op}")
        raise "strategy does not support inline op: @<#{op}>"
      end
      @strategy.__send__("inline_#{op}", arg)
    rescue => err
      error err.message
      @strategy.nofunc_text(str)
    end

    def warn(msg)
      @strategy.warn msg
    end

    def error(msg)
      @strategy.error msg
    end

=end

    #------------------------------

    ## ブロック命令
    defblock :program, 0..3      ## プログラム
    defblock :terminal, 0..3     ## ターミナル
    defblock :output, 0..3       ## 出力結果
    defblock :sideimage, 2..3    ## テキストの横に画像を表示
    defblock :abstract, 0        ## 章の概要
    defblock :chapterauthor, 1   ## 章の著者
    defblock :talklist, 0..1     ## 会話リスト
    defblock :talk, 1..3, true   ## 会話項目
    defblock :t, 1..3, true      ## 会話項目（ショートカット用）
    defblock :desclist, 0..1     ## キーと説明文のリスト
    defblock :desc, 1..2, true   ## キーと説明文のリスト
    defblock :list, 0..3         ## （上書き）
    defblock :listnum, 0..3      ## （上書き）
    defblock :note, 0..2         ## （上書き）
    defblock :texequation, 0..2  ## （上書き）
    defblock :table, 0..3        ## （上書き）
    defblock :imgtable, 0..3     ## （上書き）

    defsingle :makechaptitlepage, 0..1  ## 章扉をつける
    defsingle :needvspace, 2     ## 縦方向のスペースがなければ改ページ
    defsingle :paragraphend, 0   ## 段の終わりにスペースを入れる
    defsingle :subparagraphend, 0## 小段の終わりにスペースを入れる（あれば）
    defsingle :vspace, 2         ## 縦方向の空きを入れる（\vspace）
    defsingle :addvspace, 2      ## 縦方向の空きを入れる（\addvspace）
    defsingle :tsize, 1..2       ## （上書き）

    ## インライン命令
    definline :par               ## 箇条書き内で改段落するのに使う
    definline :balloon           ## コード内でのふきだし説明（Re:VIEW3から追加）
    definline :eq                ## 数式を参照
    definline :secref            ## 節(Section)や項(Subsection)を参照
    definline :noteref           ## ノートを参照
    definline :hlink             ## @<href>{}の代わり
    definline :term              ## @<idx>{}かつゴシック体
    definline :termnoidx         ## ゴシック体にするだけで索引には登録しない
    definline :file              ## ファイル名
    definline :userinput         ## ユーザ入力
    definline :nop               ## 引数をそのまま表示 (No Operation)
    definline :letitgo           ## （nopのエイリアス名）
    definline :foldhere          ## 折り返し箇所を手動で指定
    definline :cursor            ## ターミナルでのカーソル
    definline :qq                ## 「``」と「''」で囲う
    definline :weak              ## 目立たせない（@<strong>{} の反対）
    definline :small             ## 文字サイズを小さく
    definline :xsmall            ## 文字サイズをもっと小さく
    definline :xxsmall           ## 文字サイズをもっともっと小さく
    definline :large             ## 文字サイズを大きく
    definline :xlarge            ## 文字サイズをもっと大きく
    definline :xxlarge           ## 文字サイズをもっともっと大きく
    definline :xstrong           ## 文字を大きくした@<strong>{}
    definline :xxstrong          ## 文字をもっと大きくした@<strong>{}
    definline :w                 ## キーに対応した単語に展開
    definline :wb                ## キーに対応した単語に展開、かつ太字で表示
    definline :W                 ## キーに対応した単語に展開、かつ強調表示

    private

    ## パーサを再帰呼び出しに対応させる

    def do_compile
      f = LineInput.new(StringIO.new(@chapter.content))
      @strategy.bind self, @chapter, Location.new(@chapter.basename, f)
      tagged_section_init()
      parse_document(f, false)
      close_all_tagged_section()
    end

    BLOCK_END_REXP = /\A\/\/\}\s*$/

    def parse_document(f, block_cmd)
      while f.next?
        case f.peek
        when /\A\#@/
          f.gets # Nothing to do
        when /\A=+[\[\s\{]/
          if block_cmd                      #+
            line = f.gets                   #+
            error "'#{line.strip}': should close '//#{block_cmd}' block before sectioning." #+
          end                               #+
          compile_headline f.gets
        #when /\A\s+\*/                     #-
        #  compile_ulist f                  #-
        when LIST_ITEM_REXP                 #+
          compile_list(f)                   #+
        when /\A\s+\d+\./
          compile_olist f
        when /\A\s*:\s/
          compile_dlist f
        #when %r{\A//\}}                    #-
        when BLOCK_END_REXP                 #+
          return if block_cmd               #+
          f.gets
          #error 'block end seen but not opened'                   #-
          error "'//}': block-end found, but no block command opened."  #+
        #when %r{\A//[a-z]+}                       #-
        #  name, args, lines = read_command(f)     #-
        #  syntax = syntax_descriptor(name)        #-
        #  unless syntax                           #-
        #    error "unknown command: //#{name}"    #-
        #    compile_unknown_command args, lines   #-
        #    next                                  #-
        #  end                                     #-
        #  compile_command syntax, args, lines     #-
        when /\A\/\/\w+/                           #+
          parse_block_command(f)                   #+
        when %r{\A//}
          line = f.gets
          warn "`//' seen but is not valid command: #{line.strip.inspect}"
          if block_open?(line)
            warn 'skipping block...'
            read_block(f, false)
          end
        else
          if f.peek.strip.empty?
            f.gets
            next
          end
          compile_paragraph f
        end
      end
    end

    ## コードブロックのタブ展開を、LaTeXコマンドの展開より先に行うよう変更。
    ##
    ## ・たとえば '\\' を '\\textbackslash{}' に展開してからタブを空白文字に
    ##   展開しても、正しい展開にはならないことは明らか。先にタブを空白文字に
    ##   置き換えてから、'\\' を '\\textbackslash{}' に展開すべき。
    ## ・またタブ文字の展開は、本来はBuilderではなくCompilerで行うべきだが、
    ##   Re:VIEWの設計がまずいのでそうなっていない。
    ## ・'//table' と '//embed' ではタブ文字の展開は行わない。
    def read_block_for(cmdname, f)   # 追加
      disable_comment = cmdname == :embed    # '//embed' では行コメントを読み飛ばさない
      ignore_inline   = _ignore_inline?(cmdname)  # '//embed' と '//table' ではインライン命令を解釈しない
      enable_detab    = cmdname !~ /\A(?:em)?table\z/  # '//table' ではタブ展開しない
      f.enable_comment(false) if disable_comment
      lines = read_block(f, ignore_inline, enable_detab) { "//#{cmdname}" }
      f.enable_comment(true)  if disable_comment
      return lines
    end
    def _ignore_inline?(cmdname)
      return RAW_BLOCK_COMMANDS[cmdname]
    end
    def read_block(f, ignore_inline, enable_detab=true)   # 上書き
      head = f.lineno
      buf = []
      builder = @strategy                            #+
      #f.until_match(%r{\A//\}}) do |line|           #-
      f.until_match(BLOCK_END_REXP) do |line|        #+
        if ignore_inline
          buf.push line
        elsif line !~ /\A\#@/
          #buf.push text(line.rstrip)                #-
          line = line.rstrip                         #+
          line = builder.detab(line) if enable_detab #+
          buf << parse_text(line)                    #+
        end
      end
      #unless %r{\A//\}} =~ f.peek                   #-
      unless f.peek() =~ BLOCK_END_REXP              #+
        if block_given?                              #+
          error "#{yield} (at line #{head}): block command not closed." #+
        else                                         #+
          error "unexpected EOF (block begins at: #{head})"
        end                                          #+
        return buf
      end
      f.gets # discard terminator
      buf
    end

    RAW_BLOCK_COMMANDS = {
      embed: true,
      raw: true,
      table: true,
      list: true,
      emlist: true,
      listnum: true,
      emlistnum: true,
      source: true,
      program: true,
      terminal: true,
      cmd: true,
      output: true,
    }

    ## ブロック命令を入れ子可能に変更（'//note' と '//quote'）

    def parse_block_command(f)
      line = f.gets()
      lineno = f.lineno
      line =~ /\A\/\/(\w+)(\[.*\])?(\{)?$/  or
        error "'#{line.strip}': invalid block command format."
      cmdname = $1.intern; argstr = $2; curly = $3
      ##
      prev = @strategy.doc_status[cmdname]
      @strategy.doc_status[cmdname] = true
      ## 引数を取り出す
      syntax = syntax_descriptor(cmdname)  or
        error "'//#{cmdname}': unknown command"
      args = parse_args(argstr || "", cmdname)
      begin
        syntax.check_args args
      rescue CompileError => err
        error err.message
      end
      ## ブロックをとらないコマンドにブロックが指定されていたらエラー
      if curly && !syntax.block_allowed?
        error "'//#{cmdname}': this command should not take block (but given)."
      end
      ## ブロックの入れ子をサポートしてあれば、再帰的にパースする
      handler = "on_#{cmdname}_block"
      builder = @strategy
      if builder.respond_to?(handler)
        if curly
          builder.__send__(handler, *args) do
            parse_document(f, cmdname)
          end
          s = f.peek()
          f.peek() =~ BLOCK_END_REXP  or
            error "'//#{cmdname}': not closed (reached to EOF)"
          f.gets()   ## '//}' を読み捨てる
        else
          builder.__send__(handler, *args)
        end
      ## そうでなければ、従来と同じようにパースする
      elsif builder.respond_to?(cmdname)
        if !syntax.block_allowed?
          builder.__send__(cmdname, *args)
        elsif curly
          lines = read_block_for(cmdname, f)
          builder.__send__(cmdname, lines, *args)
        else
          lines = default_block(syntax)
          builder.__send__(cmdname, lines, *args)
        end
      else
        error "'//#{cmdname}': #{builder.class.name} not support this command"
      end
      ##
      @strategy.doc_status[cmdname] = prev
    end

    ## 箇条書きの文法を拡張

    LIST_ITEM_REXP = /\A( +)(\*+|\-+) +/    # '*' は unordred list、'-' は ordered list

    def compile_list(f)
      line = f.gets()
      line =~ LIST_ITEM_REXP
      indent = $1
      char = $2[0]
      $2.length == 1  or
        error "#{$2[0]=='*'?'un':''}ordered list should start with level 1"
      line = parse_list(f, line, indent, char, 1)
      f.ungets(line)
    end

    def parse_list(f, line, indent, char, level)
      if char != '*' && line =~ LIST_ITEM_REXP
        start_num, _ = $'.lstrip().split(/\s+/, 2)
      end
      st = @strategy
      char == '*' ? st.ul_begin { level } : st.ol_begin(start_num) { level }
      while line =~ LIST_ITEM_REXP  # /\A( +)(\*+|\-+) +/
        $1 == indent  or
          error "mismatched indentation of #{$2[0]=='*'?'un':''}ordered list"
        mark = $2
        text = $'
        if mark.length == level
          break unless mark[0] == char
          line = parse_item(f, text.lstrip(), indent, char, level)
        elsif mark.length < level
          break
        else
          raise "internal error"
        end
      end
      char == '*' ? st.ul_end { level } : st.ol_end { level }
      return line
    end

    def parse_item(f, text, indent, char, level)
      if char != '*'
        num, text = text.split(/\s+/, 2)
        text ||= ''
      end
      #
      buf = [parse_text(text)]
      while (line = f.gets()) && line =~ /\A( +)/ && $1.length > indent.length
        buf << parse_text(line)
      end
      #
      st = @strategy
      char == '*' ? st.ul_item_begin(buf) : st.ol_item_begin(buf, num)
      rexp = LIST_ITEM_REXP  # /\A( +)(\*+|\-+) +/
      while line =~ rexp && $2.length > level
        $2.length == level + 1  or
          error "invalid indentation level of (un)ordred list"
        line = parse_list(f, line, indent, $2[0], $2.length)
      end
      char == '*' ? st.ul_item_end() : st.ol_item_end()
      #
      return line
    end

    def compile_dlist(f)
      @strategy.dl_begin()
      while /\A\s*:/ =~ f.peek()
        dtext = f.gets.sub(/\A\s*:/, '').strip
        @strategy.dt(parse_text(dtext))
        buf = []
        li_rexp = LIST_ITEM_REXP
        indent = nil
        first_p = true
        @strategy.dl_dd_begin()
        while (line = f.peek()) =~ /\A( [ \t]+|\t\s*)/ || line =~ /\A\s*$/
          indent ||= $1
          if indent
            line =~ /\A\s*$/ || line.start_with?(indent)  or
              warn "` : #{dtext}': indent mismatched (maybe space and tab are mixed)"
            if _dl_start_list?(line, indent, li_rexp)
              buf, first_p = _dl_par(buf, first_p) unless buf.empty?
              compile_list(f)
              @strategy.noindent  # disable indent just after ordered/unordered list
              next
            end
          end
          if line =~ /\A\s*$/
            buf, first_p = _dl_par(buf, first_p) unless buf.empty?
          else
            buf << parse_text(line)
          end
          f.gets()
        end
        _, _ = _dl_par(buf, first_p) unless buf.empty?
        @strategy.dl_dd_end()
        f.skip_blank_lines()
        f.skip_comment_lines()
      end
      @strategy.dl_end()
    end

    def _dl_start_list?(line, indent, li_rexp)
      return line.start_with?(indent) && line.sub(indent, '') =~ li_rexp && line =~ li_rexp
    end

    def _dl_par(buf, first_p)
      return buf, first_p if buf.empty?
      if first_p
        @strategy.puts buf.join
      else
        @strategy.paragraph(buf)
      end
      return [], false
    end

    public

    ## 入れ子のインライン命令をパースできるよう上書き
    def parse_text(line)
      stack      = []
      tag_name   = nil
      close_char = nil
      items      = [""]
      nestable   = true
      scan_inline_command(line) do |text, s1, s2, s3|
        if s1     # ex: '@<code>{', '@<b>{', '@<m>$'
          if nestable
            items << text
            stack.push([tag_name, close_char, items])
            s1 =~ /\A@<(\w+)>([{$|])\z/  or raise "internal error"
            tag_name   = $1
            close_char = $2 == '{' ? '}' : $2
            items      = [""]
            nestable   = false if ignore_nested_inline_command?(tag_name)
          else
            items[-1] << text << s1
          end
        elsif s2  # '\}' or '\\' (not '\$' nor '\|')
          text << (close_char == '}' ? s2[1] : s2)
          items[-1] << text
        elsif s3  # '}', '$', or '|'
          items[-1] << text
          if close_char == s3
            items.delete_if {|x| x.empty? }
            elem = [tag_name, {}, items]
            tag_name, close_char, items = stack.pop()
            items << elem << ""
            nestable = true
          else
            items[-1] << s3
          end
        else
          if items.length == 1 && items[-1].empty?
            items[-1] = text
          else
            items[-1] << text
          end
        end
      end
      if tag_name
        error "inline command '@<#{tag_name}>' not closed."
      end
      items.delete_if {|x| x.empty? }
      #
      return compile_inline_command(items)
    end

    alias text parse_text

    private

    def scan_inline_command(line)
      pos = 0
      line.scan(/(\@<\w+>[{$|])|(\\[\\}])|([}$|])/) do
        m = Regexp.last_match
        text = line[pos, m.begin(0)-pos]
        pos = m.end(0)
        yield text, $1, $2, $3
      end
      remained = pos == 0 ? line : line[pos..-1]
      yield remained, nil, nil, nil
    end

    def compile_inline_command(items)
      buf = ""
      strategy = @strategy
      items.each do |x|
        case x
        when String
          buf << strategy.nofunc_text(x)
        when Array
          tag_name, attrs, children = x
          op = tag_name
          inline_defined?(op)  or
            raise CompileError, "no such inline op: #{op}"
          if strategy.respond_to?("on_inline_#{op}")
            buf << strategy.__send__("on_inline_#{op}") {|both_p|
              if !both_p
                compile_inline_command(children)
              else
                [compile_inline_command(children), children]
              end
            }
          elsif strategy.respond_to?("inline_#{op}")
            children.empty? || children.all? {|x| x.is_a?(String) }  or
              error "'@<#{op}>' does not support nested inline commands."
            buf << strategy.__send__("inline_#{op}", children[0])
          else
            error "strategy does not support inline op: @<#{op}> (strategy.class=#{strategy.class})"
          end
        else
          raise "internal error: x=#{x.inspect}"
        end
      end
      buf
    end

    def ignore_nested_inline_command?(tag_name)
      return IGNORE_NESTED_INLINE_COMMANDS.include?(tag_name)
    end

    IGNORE_NESTED_INLINE_COMMANDS = Set.new(['m', 'raw', 'embed', 'idx', 'hidx', 'term'])

  end


  ## コメント「#@#」を読み飛ばす（ただし //embed では読み飛ばさない）
  class LineInput

    def initialize(f)
      super
      @enable_comment = true
    end

    def enable_comment(flag)
      @enable_comment = flag
    end

    def gets
      line = super
      if @enable_comment
        while line && line =~ /\A\#\@/
          line = super
        end
      end
      return line
    end

  end


  class Catalog

    def parts_with_chaps
      ## catalog.ymlの「CHAPS:」がnullのときエラーになるのを防ぐ
      (@yaml['CHAPS'] || []).flatten.compact
    end

  end


  class Book::ListIndex

    ## '//program' と '//terminal' と '//output' をサポートするよう拡張
    def self.item_type  # override
      #'(list|listnum)'            # original
      '(list|listnum|program|terminal|output)'
    end

    ## '//list' や '//terminal' のラベル（第1引数）を省略できるよう拡張
    def self.parse(src, *args)  # override
      items = []
      seq = 1
      src.grep(%r{\A//#{item_type()}}) do |line|
        if id = line.slice(/\[(.*?)\]/, 1)
          next if id.empty?                     # 追加
          items.push item_class().new(id, seq)
          seq += 1
          ReVIEW.logger.warn "warning: no ID of #{item_type()} in #{line}" if id.empty?
        end
      end
      new(items, *args)
    end

  end


  ## ノートブロック（//note）のラベル用
  class Book::NoteIndex < Book::Index   # create new class for '//note'
    Item = Struct.new(:id, :caption)

    def self.parse(src_lines)
      rexp = /\A\/\/note\[([^\]]+)\]\[(.*?[^\\])\]/ # $1: label, $2: caption
      items = src_lines.grep(rexp) {|line|
        label = $1.strip(); caption = $2.gsub(/\\\]/, ']')
        next if label.empty?
        label =~ /\A[-_a-zA-Z0-9]+\z/  or
          error "'#{line}': invalid label (only alphabet, number, '_' or '-' available)"
        Item.new(label, caption)
      }.compact()
      self.new(items)
    end

  end


  ## 数式（//texequation）のラベル用
  class Book::EquationIndex < Book::Index
    def self.item_type
      '(texequation)'
    end
  end


  module Book::Compilable

    def note(id)
      note_index()[id]
    end

    def note_index
      @note_index ||= Book::NoteIndex.parse(lines())
      @note_index
    end

    def equation(id)
      equation_index()[id]
    end

    def equation_index
      @equation_index ||= Book::EquationIndex.parse(lines())
      @equation_index
    end

    def content   # override
      ## //list[?] や //terminal[?] の '?' をランダム文字列に置き換える。
      ## こうすると、重複しないラベルをいちいち指定しなくても、ソースコードや
      ## ターミナルにリスト番号がつく。ただし @<list>{} での参照はできない。
      unless @_done
        pat1 = Book::ListIndex.item_type  # == '(list|listnum|program|terminal|output)'
        pat2 = Book::TableIndex.item_type # == '(table|imgtable)'
        pat = "#{pat1[1..-2]}|#{pat2[1..-2]}"
        @content = @content.gsub(/^\/\/(#{pat})\[\?\]/) { "//#{$1}[#{_random_label()}]" }
        ## 改行コードを「\n」に統一する
        @content = @content.gsub(/\r\n/, "\n")
        ## (experimental) 範囲コメント（'#@+++' '#@---'）を行コメント（'#@#'）に変換
        @content = @content.gsub(/^\#\@\+\+\+$.*?^\#\@\-\-\-$/m) { $&.gsub(/^/, '#@#') }
        @_done = true
      end
      @content
    end

    module_function

    def _random_label
      #"_" + rand().to_s[2..10]
      "_" + RANDOM.rand().to_s[2..10]
    end

    RANDOM = Random.new(22360679)

  end


end
