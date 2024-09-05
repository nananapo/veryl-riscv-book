# -*- coding: utf-8 -*-

###
### ReVIEW::WEBMakerクラスを書き直す
### （でも元がひどすぎるので書き直すにも限界がある）
###

require 'pathname'
require 'fileutils'
require 'erb'
require 'review/converter'
require 'review/htmlbuilder'
require 'review/template'
require 'review/webmaker'
require_relative './review-maker'


module ReVIEW

  remove_const :WEBMaker


  class WEBMaker < Maker

    SCRIPT_NAME = "review-webmaker"

    def initialize(*args)
      super
      @config['htmlext'] = 'html'
      @docroot = @config['docroot'] || 'webroot'
    end

    def generate()
      remove_old_files()
      FileUtils.mkdir_p(@docroot)
      #
      @book = ReVIEW::Book.load(@basedir)
      @book.config = @config
      #
      copy_stylesheet()
      copy_frontmatter()
      build_body()
      copy_backmatter()
      #
      imagedir = @config['imagedir']
      destdir  = "#{@docroot}/#{imagedir}"
      copy_images(imagedir, destdir)
      #
      copy_resources('covers', destdir)
      copy_resources('adv',    destdir)
      copy_resources(@config['fontdir'], "#{@docroot}/fonts", @config['font_ext'])
    end

    def build_body()
      base_path = Pathname.new(@basedir)
      @converter = ReVIEW::Converter.new(@book, new_builder())
      @book.parts.each do |part|
        if part.name.present?
          if part.file?
            build_chap(part, base_path, true)
          else
            htmlfile = "part_#{part.number}.#{@config['htmlext']}"
            build_part(part, htmlfile)
            # title = ReVIEW::I18n.t('part', part.number)
            # title += ReVIEW::I18n.t('chapter_postfix') + part.name.strip unless part.name.strip.empty?
          end
        end
        part.chapters.each do |chap|
          build_chap(chap, base_path, false)
        end
      end
    end

    def new_builder()
      builder = ReVIEW::WEBBuilder.new()
      builder.starter_config = @starter_config
      return builder
    end

    def new_renderer()
      return WEBRenderer.new(@config, @book, @basedir, @starter_config)
    end

    def build_part(part, htmlfile)
      html = new_renderer().render_part(part)
      filepath = File.join(@docroot, htmlfile)
      File.write(filepath, html)
    end

    def build_chap(chap, base_path, ispart)
      filename = \
        if ispart.present?
          chap.path
        else
          Pathname.new(chap.path).relative_path_from(base_path).to_s
        end
      chapter_id = filename.sub(/\.re\Z/, '')
      htmlfile = "#{chapter_id}.#{@config['htmlext']}"
      #
      if @config['params'].present?
        warn "'params:' in config.yml is obsoleted."
      end
      #
      begin
        @converter.convert(filename, File.join(@docroot, htmlfile))
      ## 文法エラーだけキャッチし、それ以外のエラーはキャッチしないよう変更
      #rescue => ex
      rescue ApplicationError => ex
        warn "compile error in #{filename} (#{ex.class})"
        warn colored_errmsg(ex.message)
        generate_errorpage(ex, filename, htmlfile)
      end
    end

    def remove_old_files()
      math_dir = "./#{@config['imagedir']}/_review_math"
      FileUtils.rm_rf(math_dir) if @config['imgmath'] && Dir.exist?(math_dir)
      FileUtils.rm_rf(@docroot)
    end

    def copy_images(srcdir, destdir)
      copy_resources(srcdir, destdir, nil)
    end

    def copy_resources(srcdir, destdir, allow_exts=nil)
      if srcdir && File.exist?(srcdir)
        FileUtils.mkdir_p(destdir)
        allow_exts ||= @config['image_ext']
        ok = allow_exts && ! allow_exts.empty?
        ext_rexp = ok ? /\.(#{allow_exts.join('|')})\Z/i : nil
        _recursive_copy_files(srcdir, destdir, ext_rexp)
      end
    end

    def _recursive_copy_files(srcdir, destdir, ext_rexp)
      Dir.open(srcdir) do |dir|
        dir.each do |fname|
          next if fname.start_with?('.')
          srcpath = "#{srcdir}/#{fname}"
          if File.directory?(srcpath)
            destpath = "#{destdir}/#{fname}"
            _recursive_copy_files(srcpath, destpath, ext_rexp)
          elsif ext_rexp.nil? || fname =~ ext_rexp
            FileUtils.mkdir_p(destdir)
            FileUtils.cp(srcpath, destdir)
          end
        end
      end
    end

    def copy_stylesheet()
      cssdir = File.join(@docroot, "css")
      Dir.mkdir(cssdir) unless File.directory?(cssdir)
      [@config['stylesheet']].flatten.compact.each do |x|
        FileUtils.cp("css/#{x}", cssdir)
      end
    end

    def copy_frontmatter()
      generate_indexpage('index.html')
      #
      if @config['titlepage']
        destfile = "titlepage.#{@config['htmlext']}"
        if @config['titlefile']
          FileUtils.cp(@config['titlefile'], "#{@docroot}/#{destfile}")
        else
          generate_titlepage(destfile)
        end
      end
      #
      _copy_file(@config['creditfile'])
      _copy_file(@config['originaltitlefile'])
    end

    def generate_errorpage(ex, filename, htmlfile)
      s = new_renderer().render_exception(ex, filename)
      File.write(File.join(@docroot, htmlfile), s)
    end

    def generate_indexpage(htmlfile)
      s = new_renderer().render_indexpage()
      File.write(File.join(@docroot, htmlfile), s)
    rescue => ex
      generate_errorpage(ex, nil, htmlfile)
    end

    def generate_titlepage(htmlfile)
      s = new_renderer().render_titlepage()
      File.write(File.join(@docroot, htmlfile), s)
    end

    def copy_backmatter()
      conf = @config
      ext = conf['htmlext']
      _copy_file(conf['profile'])
      _copy_file(conf['advfile'])
      _copy_file(conf['colophon'], "colophon.#{ext}") if conf['colophon'].is_a?(String)
      _copy_file(conf['backcover'])
    end

    def _copy_file(srcfile, destfile=nil)
      if srcfile && File.exist?(srcfile)
        destfile ||= File.basename(srcfile)
        FileUtils.cp(srcfile, File.join(@docroot, destfile))
      end
    end

  end


  class WEBBuilder < HTMLBuilder

    def target_name
      #"web"
      "html"
    end

    def layoutfile
      "layouts/layout.html5.erb"
    end

  end


  class WEBRenderer < BaseRenderer

    def initialize(*args)
      super
      @language    = @config['language']
      @stylesheets = @config['stylesheet']
    end

    def layout_template_name()
      #if @config['htmlversion'].to_i == 5
      #  'web/html/layout-html5.html.erb'
      #else
      #  'web/html/layout-xhtml1.html.erb'
      #end
      "layout.html5.erb"
    end

    def render_exception(error, textfile)
      @error    = error
      @textfile = textfile
      #
      return render()
    end

    def render_part(part)
      part_name = part.name.strip
      #
      sb = ""
      sb << "<div class=\"part\">\n"
      sb << "<h1 class=\"part-number\">#{h i18n('part', part.number)}</h1>\n"
      sb << "<h2 class=\"part-title\">#{h part_name}</h2>\n" if part_name.present?
      sb << "<ul>\n"
      part.chapters.each do |c|
        htmlfile = c.path.sub(/\.re\z/, ".#{@config['htmlext']}")
        sb << "  <li><a href=\"#{h htmlfile}\">第#{h c.number}章 #{h c.title}</a></li>\n"
      end
      sb << "</ul>\n"
      sb << "</div>\n"
      @body = sb
      #
      return render()
    end

    def render_indexpage()
      if @config['coverimage']
        imgfile = File.join(@config['imagedir'], @config['coverimage'])
      else
        imgfile = nil
      end
      #
      sb = ""
      if imgfile
        sb << "  <div id=\"cover-image\" class=\"cover-image\">\n"
        sb << "    <img src=\"#{imgfile}\" class=\"max\"/>\n"
        sb << "  </div>\n"
      end
      @body = sb
      @toc = ReVIEW::WEBTOCPrinter.book_to_html(@book, nil)
      @next = @book.chapters[0]
      @next_title = @next ? @next.title : ''
      #
      return render()
    end

    def render_titlepage()
      author    = @config['aut'] ? _join_names(@config.names_of('aut')) : nil
      publisher = @config['pbl'] ? _join_names(@config.names_of('pbl')) : nil
      #
      sb = ""
      sb << "<div class=\"titlepage\">\n"
      sb << "<h1 class=\"tp-title\">#{h @config.name_of('booktitle')}</h1>\n"
      sb << "<h2 class=\"tp-author\">#{author}</h2>\n"        if author
      sb << "<h3 class=\"tp-publisher\">#{publisher}</h3>\n"  if publisher
      sb << "</div>\n"
      @body = sb
      #
      return render()
    end

    private

    def _join_names(names)
      sep = i18n('names_splitter')
      return [names].flatten.join(sep)
    end

  end


  class WEBTOCPrinter

    def self.book_to_html(book, current_chapter)
      printer = self.new(nil, nil, nil)
      arr = printer.handle_book(book, current_chapter)
      html = printer.render_html(arr)
      return html
    end

    def render_html(arr)
      tag, attr, children = arr
      tag == "book"  or raise "internal error: tag=#{tag.inspect}"
      buf = "<ul class=\"toc toc-1\">\n"
      children.each do |child|
        _render_li(child, buf, 1)
      end
      buf << "</ul>\n"
      return buf
    end

    def parse_inline(str)
      builder = HTMLBuilder.new
      builder.instance_variable_set('@book', @_book)
      @compiler ||= Compiler.new(builder)
      return @compiler.text(str)
    end

    def _render_li(arr, buf, n)
      tag, attr, children = arr
      case tag
      when "part"
        buf << "<li class=\"toc-part\">#{parse_inline(attr[:label])}\n"
        buf << "  <ul class=\"toc toc-#{n+1}\">\n"
        children.each {|child| _render_li(child, buf, n+1) }
        buf << "  </ul>\n"
        buf << "</li>\n"
      when "chapter"
        buf << "    <li class=\"toc-chapter\"><a href=\"#{h attr[:path]}\">#{parse_inline(attr[:label])}</a>"
        if children && !children.empty?
          buf << "\n      <ul class=\"toc toc-#{n+1}\">\n"
          children.each {|child| _render_li(child, buf, n+1) }
          buf << "      </ul>\n"
          buf << "    </li>\n"
        else
          buf << "</li>\n"
        end
      when "section"
        buf << "        <li class=\"toc-section\"><a href=\"##{attr[:anchor]}\">#{parse_inline(attr[:label])}</a></li>\n"
      end
      buf
    end

    def handle_book(book, current_chapter)
      @_book = book
      children = []
      book.each_part do |part|
        if part.number
          children << handle_part(part, current_chapter)
        else
          part.each_chapter do |chap|
            children << handle_chapter(chap, current_chapter)
          end
        end
      end
      #
      attrs = {
        title: book.config['booktitle'],
        subtitle: book.config['subtitle'],
      }
      return ["book", attrs, children]
    end

    def handle_part(part, current_chapter)
      children = []
      part.each_chapter do |chap|
        children << handle_chapter(chap, current_chapter)
      end
      #
      attrs = {
        number: part.number,
        title:  part.title,
        #label:  "#{I18n.t('part_short', part.number)} #{part.title}",
        label:  "#{I18n.t('part', part.number)} #{part.title}",
      }
      return ["part", attrs, children]
    end

    def handle_chapter(chap, current_chapter)
      children = []
      if current_chapter.nil? || chap == current_chapter
        chap.headline_index.each do |sec|
          next if sec.number.present? && sec.number.length >= 2
          children << handle_section(sec, chap)
        end
      end
      #
      chap_node = TOCParser.chapter_node(chap)
      ext   = chap.book.config['htmlext'] || 'html'
      path  = chap.path.sub(/\.re\z/, ".#{ext}")
      label = if chap_node.number && chap.on_chaps?
                "#{I18n.t('chapter_short', chap.number)} #{chap.title}"
              else
                chap.title
              end
      #
      attrs = {
        number: chap_node.number,
        title:  chap.title,
        label:  label,
        path:   path,
      }
      return ["chapter", attrs, children]
    end

    def handle_section(sec, chap)
      if chap.number && sec.number.length > 0
        number = [chap.number] + sec.number
        label  = "#{number.join('.')} #{sec.caption}"
      else
        number = nil
        label  = sec.caption
      end
      attrs = {
        number: number,
        title:  sec.caption,
        label:  label,
        anchor: "h#{number ? number.join('-') : ''}",
      }
      return ["section", attrs, []]
    end

  end


end
