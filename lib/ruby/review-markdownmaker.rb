# -*- coding: utf-8 -*-

require 'pathname'

require_relative './review-cli'
require_relative './review-maker'
require_relative './review-markdownbuilder'


module ReVIEW


  class MarkdownMaker < Maker

    SCRIPT_NAME = "review-markdownmaker"

    def generate()
      @build_dir = make_build_dir()
      begin
        book = load_book()  # also loads 'review-ext.rb'
        converter = ReVIEW::Converter.new(book, new_builder())
        errors = create_input_files(converter, book)
        if errors && !errors.empty?
          handle_compile_errors(errors)
        end
        return @build_dir
      ensure
      end
    end

    protected

    def new_builder()
      return ReVIEW::MarkdownBuilder.new
    end

    def make_build_dir()
      dir = "#{@config['bookname']}-md"
      if !File.directory?(dir)
        Dir.mkdir(dir)
      else
        Dir.glob("#{dir}/*").each {|x| FileUtils.rm_rf(x) }
      end
      return dir
    end

    def create_input_files(converter, book)
      errors = []
      book.each_input_file do |part, chap|
        if part
          err = output_chaps(converter, part.name) if part.file?
        elsif chap
          filename = File.basename(chap.path, '.*')
          err = output_chaps(converter, filename)
        end
        errors << err if err
      end
      return errors
    end

    def output_chaps(converter, filename)
      contdir = @config['contentdir']
      infile  = "#{filename}.re"
      infile  = File.join(contdir, infile) if contdir.present?
      outfile = "#{filename}.md"
      $stderr.puts "compiling #{outfile}"
      begin
        converter.convert(infile, File.join(@build_dir, outfile))
        nil
      ## 文法エラーだけキャッチし、それ以外のエラーはキャッチしないよう変更
      ## （LATEXBuilderで起こったエラーのスタックトレースを表示する）
      rescue ApplicationError => ex
        warn "compile error in #{outfile} (#{ex.class})"
        warn colored_errmsg(ex.message)
        ex.message
      end
    end

    def handle_compile_errors(errors)
      return if errors.nil? || errors.empty?
      if @config['ignore-errors']
        $stderr.puts 'compile error, but try to generate PDF file'
      else
        error 'compile error, No PDF file output.'
      end
    end

  end


end
