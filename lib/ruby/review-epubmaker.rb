# -*- coding: utf-8 -*-

#
# Copyright (c) 2010-2017 Kenshi Muto and Masayoshi Takahashi
#
# This program is free software.
# You can distribute or modify this program under the terms of
# the GNU LGPL, Lesser General Public License version 2.1.
# For details of the GNU LGPL, see the file "COPYING".
#

require 'review/epubmaker'

require_relative './review-maker'


module ReVIEW


  class EpubMaker < Maker

    SCRIPT_NAME = "review-epubmaker"

    def initialize(config_filename, optional_values={})
      super
      @htmltoc = nil
      @buildlogtxt = 'build-log.txt'
      @producer = ::EPUBMaker::Producer.new(@config)
      @producer.load(config_filename)
      @config = @producer.config
      @config.maker = 'epubmaker'
    end

    def log(s)
      puts s if debug?()
    end

    def prepare_build_dir()
      dir = "#{@config['bookname']}-epub"
      if debug?()
        builddir = File.expand_path(dir, Dir.pwd)
        FileUtils.rm_rf(builddir, secure: true) if File.exist?(builddir)
        FileUtils.mkdir_p(builddir)
      else
        builddir = Dir.mktmpdir("#{dir}-")
      end
      #
      if @config['imgmath']
        math_dir = "./#{@config['imagedir']}/_review_math"
        FileUtils.rm_rf(math_dir) if Dir.exist?(math_dir)
      end
      #
      return builddir
    end

    def generate()
      bookname = @config['bookname']
      epubname = "#{bookname}.epub"
      booktmpname = "#{bookname}-epub"

      begin
        @config.check_version(ReVIEW::VERSION)
      rescue ReVIEW::ConfigError => e
        warn e.message
      end
      log("I will produce #{epubname}.")

      FileUtils.rm_f(epubname)

      builddir = prepare_build_dir()
      @builddir = builddir
      begin
        log("Created first temporary directory as #{builddir}.")

        call_hook('hook_beforeprocess')

        @htmltoc = ReVIEW::HTMLToc.new(builddir)
        ## copy all files into builddir
        copy_stylesheet()

        copy_frontmatter()
        call_hook('hook_afterfrontmatter')

        build_body()
        call_hook('hook_afterbody')

        copy_backmatter()
        call_hook('hook_afterbackmatter')

        ## push contents in builddir into @producer
        push_contents()

        imagedir = @config['imagedir']
        imagedir_dest = File.join(builddir, imagedir)
        if @config['epubmaker']['verify_target_images'].present?
          verify_target_images()
          copy_images(imagedir, builddir)
        else
          copy_images(imagedir, imagedir_dest)
        end

        copy_resources('covers', imagedir_dest)
        copy_resources('adv', imagedir_dest)
        copy_resources(@config['fontdir'], "#{builddir}/fonts", @config['font_ext'])

        call_hook('hook_aftercopyimage')

        @producer.import_imageinfo(imagedir_dest, builddir)
        @producer.import_imageinfo("#{builddir}/fonts", builddir, @config['font_ext'])

        check_image_size(@config['image_maxpixels'], @config['image_ext'])

        if debug?()
          epubtmpdir = File.join(builddir, booktmpname)
          FileUtils.mkdir(epubtmpdir)
        else
          epubtmpdir = nil
        end
        log('Call ePUB producer.')
        @producer.produce(epubname, builddir, epubtmpdir)
        log('Finished.')
      rescue ApplicationError => ex
        raise if debug?()
        #error(ex.message)
        error(colored_errmsg(ex.message))
      ensure
        FileUtils.remove_entry_secure(builddir) unless debug?()
      end
    end

    def call_hook(hook_name)
      filename = @config['epubmaker'][hook_name]
      log("Call #{hook_name}. (#{filename})")
      return unless filename.present?
      return unless File.exist?(filename)
      return unless FileTest.executable?(filename)
      if ENV['REVIEW_SAFE_MODE'].to_i & 0x1 != 0
        warn 'hook is prohibited in safe mode. ignored.'
      else
        system(filename, @builddir)
      end
    end

    def verify_target_images()
      ## なんでメソッド名が「verify_xxx」なのに副作用があるの？アホ？
      items = @config['epubmaker']['force_include_images']
      @producer.contents.each do |content|
        File.open("#{@builddir}/#{content.file}") do |f|
          if content.media == 'application/xhtml+xml'
            REXML::Document.new(File.new(f)).each_element('//img') do |e|
              items << e.attributes['src']
              content.properties << 'svg' if e.attributes['src'] =~ /svg\Z/i
            end
          elsif content.media == 'text/css'
            f.each_line do |l|
              l.scan(/url\((.+?)\)/) { items << $1.strip }
            end
          else
          end
        end
      end
      @config['epubmaker']['force_include_images'] = items.compact.sort.uniq
    end

    def copy_images(resdir, destdir, allow_exts=nil)
      return nil unless File.exist?(resdir)
      allow_exts ||= @config['image_ext']
      FileUtils.mkdir_p(destdir)
      if @config['epubmaker']['verify_target_images'].present?
        @config['epubmaker']['force_include_images'].each do |file|
          unless File.exist?(file)
            warn "#{file} is not found, skip." if file !~ /\Ahttp[s]?:/
            next
          end
          basedir = File.dirname(file)
          dirpath = "#{destdir}/#{basedir}"
          FileUtils.mkdir_p(dirpath)
          log("Copy #{file} to the temporary directory.")
          FileUtils.cp(file, dirpath)
        end
      else
        recursive_copy_files(resdir, destdir, allow_exts)
      end
    end

    def copy_resources(resdir, destdir, allow_exts=nil)
      return nil unless File.exist?(resdir)
      allow_exts ||= @config['image_ext']
      FileUtils.mkdir_p(destdir)
      recursive_copy_files(resdir, destdir, allow_exts)
    end

    def recursive_copy_files(resdir, destdir, allow_exts)
      allow_exts_rexp = /\.(#{allow_exts.join('|')})\Z/i
      Dir.open(resdir) do |dir|
        dir.each do |fname|
          srcfile = "#{resdir}/#{fname}"
          next if fname.start_with?('.')
          if File.directory?(srcfile)
            recursive_copy_files(srcfile, "#{destdir}/#{fname}", allow_exts)
          elsif fname =~ allow_exts_rexp
            FileUtils.mkdir_p(destdir)
            log("Copy #{srcfile} to the temporary directory.")
            FileUtils.cp(srcfile, destdir)
          end
        end
      end
    end

    def check_compile_status
      return unless @compile_errors

      $stderr.puts 'compile error, No EPUB file output.'
      exit 1
    end

    def new_builder()
      builder = ReVIEW::EPUBBuilder.new()
      builder.starter_config = @starter_config
      return builder
    end

    def build_body()
      @precount = 0
      @bodycount = 0
      @postcount = 0

      @manifeststr = ''
      @ncxstr = ''
      @tocdesc = []

      basedir = @basedir
      base_path = Pathname.new(basedir)
      book = ReVIEW::Book.load(basedir)
      book.config = @config
      @book = book
      @converter = ReVIEW::Converter.new(book, new_builder())
      @compile_errors = nil
      book.parts.each do |part|
        if part.name.present?
          if part.file?
            build_chap(part, base_path, 'part')
          else
            htmlfile = "part_#{part.number}.#{@config['htmlext']}"
            build_part(part, htmlfile)
            title = ReVIEW::I18n.t('part', part.number)
            title += ReVIEW::I18n.t('chapter_postfix') + part.name.strip if part.name.strip.present?
            @htmltoc.add_item(0, htmlfile, title, chaptype: 'part')
            write_buildlogtxt(htmlfile, '')
          end
        end
        #
        part.chapters.each do |chap|
          build_chap(chap, base_path, nil)
        end
      end
      check_compile_status()
    end

    def new_renderer()
      return EPUBRenderer.new(@config, @book, @basedir, @starter_config)
    end

    def build_part(part, htmlfile)
      log("Create #{htmlfile} from a template.")
      new_renderer().generate_part_page(part, File.join(@builddir, htmlfile))
    end

    def build_chap(chap, base_path, chaptype)
      chaptype ||= _chapter_type(chap)
      filename = chaptype == 'part' ? chap.path : \
                 Pathname.new(chap.path).relative_path_from(base_path).to_s
      chap_id = _chapter_id(chap, chaptype)
      #
      htmlfile = "#{chap_id}.#{@config['htmlext']}"
      write_buildlogtxt(htmlfile, filename)
      log("Create #{htmlfile} from #{filename}.")
      #
      if (params_str = @config['params']).present?
        warn "'params:' in config.yml is obsoleted."
        if params_str =~ /stylesheet=/
          warn "stylesheets should be defined in 'stylesheet:', not in 'params:'"
        end
      end
      #
      begin
        @converter.convert(filename, File.join(@builddir, htmlfile))
        write_info_body(htmlfile, chaptype)
        remove_hidden_title(htmlfile)
      ## 文法エラーだけキャッチし、それ以外のエラーはキャッチしないよう変更
      #rescue => ex
      rescue ApplicationError => ex
        @compile_errors = true
        warn "compile error in #{filename} (#{ex.class})"
        warn colored_errmsg(ex.message)
      end
    end

    def _chapter_type(chap)
      return 'pre'  if chap.on_predef?
      return 'post' if chap.on_appendix?
      return 'body'
    end

    def _chapter_id(chap, chaptype)
      id = File.basename(chap.path).sub(/\.re\z/, '')
      if @config['epubmaker']['rename_for_legacy']
        if    chaptype == 'part';
        elsif chap.on_predef?   ; id = 'pre%02d'  % (@precount  += 1)
        elsif chap.on_appendix? ; id = 'post%02d' % (@postcount += 1)
        else                    ; id = 'chap%02d' % (@bodycount += 1)
        end
      end
      return id
    end

    def remove_hidden_title(htmlfile)
      File.open("#{@builddir}/#{htmlfile}", 'r+') do |f|
        html = _remove_hidden_title(f.read())
        f.rewind()
        f.print(html)
        f.truncate(f.tell)
      end
    end

    def _remove_hidden_title(html)
      html = html.gsub(/<h\d .*?hidden=['"]true['"].*?>.*?<\/h\d>\n/, '')
      html = html.gsub(/(<h\d .*?)\s*notoc=['"]true['"]\s*(.*?>.*?<\/h\d>\n)/, '\1\2')
      return html
    end

    def detect_properties(path)
      doc = File.open(path, encoding: 'utf-8') {|f| REXML::Document.new(f) }
      has_math = REXML::XPath.first(doc, '//m:math', 'm' => 'http://www.w3.org/1998/Math/MathML')
      has_svg  = REXML::XPath.first(doc, '//s:svg', 's' => 'http://www.w3.org/2000/svg')
      properties = []
      properties << 'mathml' if has_math
      properties << 'svg'    if has_svg
      return properties
    end

    def write_info_body(filename, chaptype)
      headlines = []
      path = File.join(@builddir, filename)
      File.open(path) do |htmlio|
        REXML::Document.parse_stream(htmlio, ReVIEWHeaderListener.new(headlines))
      end
      properties = detect_properties(path)
      prop_str = ''
      prop_str = ',properties=' + properties.join(' ') if properties.present?
      headlines.each_with_index do |headline, i|
        headline['level'] = 0 if chaptype == 'part' && headline['level'] == 1
        if i == 0
          opts = {chaptype: chaptype + prop_str, force_include: true}
          _add_headline_item(headline, filename, nil, opts)
        else
          opts = {chaptype: chaptype}
          _add_headline_item(headline, filename, headline['id'], opts)
        end
      end
    end

    def _add_headline_item(headline, filename, id, opts)
      opts[:notoc] = headline['notoc']
      entry = id ? "#{filename}\##{id}" : filename
      @htmltoc.add_item(headline['level'], entry, headline['title'], opts)
    end
    private :_add_headline_item

    def push_contents()
      toclevel = @config['toclevel']
      @htmltoc.each_item do |level, file, title, args|
        if level.to_i <= toclevel || args[:force_include]
          log("Push #{file} to ePUB contents.")
          x = nil
          hash = {'file'=>file, 'level'=>level.to_i, 'title'=>title, 'chaptype'=>args[:chaptype]}
          hash['id']         = x if (x = args[:id]).present?
          hash['properties'] = x.split(' ') if (x = args[:properties]).present?
          hash['notoc']      = x if (x = args[:notoc]).present?
          @producer.contents.push(::EPUBMaker::Content.new(hash))
        end
      end
    end

    def copy_stylesheet()
      return if @config['stylesheet'].empty?
      @config['stylesheet'].each do |sfile|
        FileUtils.cp(sfile, @builddir)
        @producer.contents.push(::EPUBMaker::Content.new('file' => sfile))
      end
    end

    def copy_frontmatter()
      cover = @config['cover']
      if cover.present?
        FileUtils.cp(cover, @builddir) if File.exist?(cover)
      end
      #
      if @config['titlepage']
        titlepage = "titlepage.#{@config['htmlext']}"
        titlefile = @config['titlefile']
        FileUtils.cp(titlefile, @builddir) if titlefile.present?
        build_titlepage(titlepage)     unless titlefile.present?
        _add_pre_item(titlepage, 'titlepagetitle')
      end
      #
      original_titlefile = @config['originaltitlefile']
      if original_titlefile.present? && File.exist?(original_titlefile)
        FileUtils.cp(original_titlefile, @builddir)
        _add_pre_item(original_titlefile, 'originaltitle')
      end
      #
      creditfile = @config['creditfile']
      if creditfile.present? && File.exist?(creditfile)
        FileUtils.cp(creditfile, @builddir)
        _add_pre_item(creditfile, 'credittitle')
      end
      #
      true
    end

    def _add_pre_item(filename, key)
      @htmltoc.add_item(1, File.basename(filename), @producer.res.v(key), chaptype: 'pre')
    end

    def build_titlepage(htmlfile)
      # TODO: should be created via epubcommon
      new_renderer().generate_title_page("#{@builddir}/#{htmlfile}")
    end

    def _join_names(names)
      sep = ReVIEW::I18n.t('names_splitter')
      return [names].flatten.join(sep)
    end

    def copy_backmatter()
      if (profile = @config['profile'])
        FileUtils.cp(profile, @builddir)
        _add_post_item(profile, 'profiletitle')
      end
      #
      if (advfile = @config['advfile'])
        FileUtils.cp(advfile, @builddir)
        _add_post_item(advfile, 'advtitle')
      end
      #
      if (colophon = @config['colophon'])
        colophon_page = File.join(@builddir, "colophon.#{@config['htmlext']}")
        if colophon.is_a?(String) # FIXME: should let obsolete this style?
          FileUtils.cp(colophon, colophon_page)
        else
          File.open(colophon_page, 'w') {|f| @producer.colophon(f) }
        end
        _add_post_item(colophon_page, 'colophontitle')
      end
      #
      if (backcover = @config['backcover'])
        FileUtils.cp(backcover, @builddir)
        _add_post_item(backcover, 'backcovertitle')
      end
      #
      true
    end

    def _add_post_item(filename, key)
      @htmltoc.add_item(1, File.basename(filename), @producer.res.v(key), chaptype: 'post')
    end

    def write_buildlogtxt(htmlfile, reviewfile)
      File.open("#{@builddir}/#{@buildlogtxt}", 'a') { |f| f.puts "#{htmlfile},#{reviewfile}" }
    end

    def check_image_size(maxpixels, allow_exts = nil)
      begin
        require 'image_size'
      rescue LoadError
        return nil
      end
      require 'find'
      allow_exts ||= @config['image_ext']

      extre = Regexp.new('\\.(' + allow_exts.delete_if { |t| %w[ttf woff otf].include?(t) }.join('|') + ')', Regexp::IGNORECASE)
      Find.find(@builddir) do |fname|
        next unless fname.match(extre)
        img = ImageSize.path(fname)
        next if img.width.nil? || img.width * img.height <= maxpixels
        h = Math.sqrt(img.height * maxpixels / img.width)
        w = maxpixels / h
        fname.sub!("#{@builddir}/", '')
        warn "#{fname}: #{img.width}x#{img.height} exceeds a limit. suggeted value is #{w.to_i}x#{h.to_i}"
      end

      true
    end


    class EPUBRenderer < BaseRenderer

      def initialize(config, book, basedir, starter_config)
        super
        @language    = @config['language']
        @stylesheets = @config['stylesheet']
      end

      protected

      def layout_template_name()
        #if @config['htmlversion'].to_i == 5
        #  './html/layout-html5.html.erb'
        #else
        #  './html/layout-xhtml1.html.erb'
        #end
        "layout.epub.erb"
      end

      def escape(s)
        return CGI.escapeHTML(s)
      end

      public

      def generate_title_page(filepath)
        c = @config
        title = escape(c.name_of('booktitle'))
        body = []
        body << "<div class=\"titlepage\">\n"
        body << "<h1 class=\"tp-title\">#{escape c.name_of('booktitle')}</h1>\n"
        body << "<h2 class=\"tp-subtitle\">#{escape c.name_of('subtitle')}</h2>\n" if c['subtitle']
        body << "<h2 class=\"tp-author\">#{escape _join_names(c.names_of('aut'))}</h2>\n" if c['aut']
        body << "<h3 class=\"tp-publisher\">#{escape _join_names(c.names_of('pbl'))}</h3>\n" if c['pbl']
        body << "</div>"
        generate_file(filepath, {title: title, body: body.join()})
      end

      def generate_part_page(part, filepath)
        part_number = i18n('part', part.number)
        part_name   = part.name.strip()
        body = []
        body << "<div class=\"part\">\n"
        body << "<h1 class=\"part-number\">#{escape part_number}</h1>\n"
        body << "<h2 class=\"part-title\">#{escape part_name}</h2>\n" if part_name.present?
        body << "</div>\n"
        generate_file(filepath, {body: body.join()})
      end

      private

      def _join_names(names)
        sep = i18n('names_splitter')
        return [names].flatten.join(sep)
      end

    end


    class ReVIEWHeaderListener
      include REXML::StreamListener

      def initialize(headlines)
        @headlines = headlines
        _clear()
      end

      def _clear()
        @content = ''
        @level   = nil
        @id      = nil
        @notoc   = nil
      end
      private :_clear

      HEADING_REXP = /\Ah(\d+)\z/

      def tag_start(name, attrs)
        v = nil
        if name =~ HEADING_REXP
          raise "#{name}, #{attrs}" if @level.present?
          @level = $1.to_i
          @id    = v if (v = attrs['id']).present?
          @notoc = v if (v = attrs['notoc']).present?
        elsif @level
          if name == 'img'
            @content << v if (v = attrs['alt']).present?
          elsif name == 'a'
            @id  = v if (v = attrs['id']).present?
          end
        end
      end

      def tag_end(name)
        if name =~ HEADING_REXP
          if @id
            attrs = {'level'=>@level, 'id'=>@id, 'title'=>@content, 'notoc'=>@notoc}
            @headlines.push(attrs)
          end
          _clear()
        end
        true
      end

      def text(text)
        @content << text.gsub("\t", '　') if @level
      end

    end

  end

end
