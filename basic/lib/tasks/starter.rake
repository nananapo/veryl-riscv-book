# -*- coding: utf-8 -*-


WEBSERVER_PORT = 9000


##
## 生成したファイルを削除
##
task :clean do
  require 'yaml'
  config = File.open("config.yml", 'r', encoding: 'utf-8') {|f| YAML.load(f) }
  x = config['bookname']  or abort("ERROR: missing 'bookname' in config.yml")
  files = [x+".pdf", x+"-pdf", x+".epub", x+"-epub", "webroot"]
  files = files.select {|x| File.exist?(x) }
  rm_rf files unless files.empty?
end



##
## Docker用のタスク。
##
namespace :docker do

  docker_image = ENV['DOCKER_IMAGE']
  docker_image = "kauplan/review2.5" if docker_image.to_s.empty?

  desc "+ pull docker image for building PDF file"
  task :setup do
    sh "docker pull #{docker_image}"
  end

  docker_run = proc do |command, opt=nil|
    docker_opts  = "--rm -v $PWD:/work -w /work"
    docker_opts += ENV.keys().grep(/^STARTER_/).map {|k| " -e #{k}" }.join()
    sh "docker run #{docker_opts} #{opt} #{docker_image} #{command}"
  end

  desc "+ run 'rake pdf' on docker"
  task :pdf do
    setup_envvars()   # defined in 'review.rake'
    docker_run.call('rake pdf')
  end

  desc "+ run 'rake pdf:nombre' on docker"
  task :'pdf:nombre' do docker_run.call('rake pdf:nombre') end

  desc "+ run 'rake epub' on docker"
  task :epub do docker_run.call('rake epub') end

  desc "+ run 'rake web' on docker"
  task :web do docker_run.call('rake web') end

  desc "+ run 'rake web:server' on docker"
  task :'web:server' do
    port = WEBSERVER_PORT
    opt  = "-it -p #{port}:#{port+1} -e WEBSERVER_PORT=#{port+1}"
    docker_run.call('rake web:server', opt)
  end

  desc "+ run 'rake markdown' on docker"
  task :markdown do docker_run.call('rake markdown') end

  desc "+ run 'rake textlint' on docker"
  task :textlint do docker_run.call('rake textlint') end

  desc "+ run 'rake textlint:setup' on docker"
  task :'textlint:setup' do docker_run.call('rake textlint:setup') end

end


##
## 初期設定
##
namespace :setup do

  desc "+ install rubygems packages"
  task :rubygems do
    if ENV['GEM_HOME'].to_s.empty?
      ENV['GEM_HOME'] = File.join(Dir.pwd, 'rubygems')
      mkdir_p 'rubygems'
    end
    ruby_version = RUBY_VERSION.split('.').map(&:to_i)  # ex: "2.5.0" -> [2, 5, 0]
    rubyzip_requires = [2, 4, 0]  # rubyzip >= 2.0 requires Ruby >= 2.4
    ruby_too_old = (ruby_version <=> rubyzip_requires) < 0
    sh "gem install rubyzip --version 1.3" if ruby_too_old
    sh "gem install review --version 2.5"
  end

  desc "+ download docker image"
  task :dockerimage do
    sh "docker pull kauplan/review2.5"
  end

end


##
## Markdownに変換する（主にtextlistを使うため）
##
desc "+ convert '*.re' files into '*.md'"
task :markdown => :prepare do
  require 'review'
  require './lib/ruby/review-markdownmaker'
  #
  setup_envvars()  # ex: `c=01-install` => ENV['STARTER_CHAPTER']='01-install'
  #
  begin
    builddir = ReVIEW::MarkdownMaker.execute(config_file())
    $_builddir = builddir
  rescue RuntimeError => ex
    if ex.message =~ /^failed to run command:/
      abort "*\n* ERROR (review-pdfmaker):\n*  #{ex.message}\n*"
    else
      raise
    end
  end
end


##
## textlintを実行する
##
task :textlint => :markdown do
  builddir = $_builddir
  textlint_path = "./node_modules/.bin/textlint"
  if File.exist?(textlint_path)
    sh "#{textlint_path} #{builddir}/*.md"
  else
    sh "textlint #{builddir}/*.md"
  end
end


namespace :textlint do

  ## see:
  ##  - https://github.com/textlint/textlint
  ##  - https://github.com/textlint/textlint/wiki/Collection-of-textlint-rule#rule-presets-japanese
  task :setup do
    require 'json'
    rcfile = ".textlintrc"
    rcdata = File.open(rcfile, encoding: 'utf-8') {|f| JSON.load(f) }
    keys = ['filters', 'rules']
    #
    failed = false
    sh "npm --version" do |ok, _| failed = !ok end
    if failed
      $stderr.puts <<END
**
** ERROR: `npm' command not installed.
**
** Please install Node.js (and npm) at first.
**
END
      exit 1
    end
    #
    sh "npm init --yes"
    sh "npm install --save-dev textlint"
    keys.each do |key|
      rcdata[key].each do |name, enabled|
        next unless enabled
        sh "npm install --save-dev textlint-rule-#{name}"
      end if rcdata[key]
    end
  end

end


##
## PDFにノンブルを入れるためのRakeタスク。
## ノンブルについては「ワンストップ！技術同人誌を書こう」第10章を参照のこと。
## https://booth.pm/ja/items/708196
##
namespace :pdf do

  color2rgb = {
    'black'     => [0.0, 0.0, 0.0],
    'white'     => [1.0, 1.0, 1.0],
    'red'       => [1.0, 0.0, 0.0],
    'green'     => [0.0, 1.0, 0.0],
    'blue'      => [0.0, 0.0, 1.0],
    'cyan'      => [0.0, 1.0, 1.0],
    'magenta'   => [1.0, 0.0, 1.0],
    'yellow'    => [1.0, 1.0, 0.0],
    #
    'gray'      => [0.50, 0.50, 0.50],
    'darkgray'  => [0.25, 0.25, 0.25],
    'lightgray' => [0.75, 0.75, 0.75],
  }

  desc "+ add nombre (rake pdf:nombre [file=*.pdf] [out=*.pdf])"
  task :nombre do
    infile  = ENV['file']; infile  = nil if infile  && infile.empty?
    outfile = ENV['out'] ; outfile = nil if outfile && outfile.empty?
    #
    begin
      require 'combine_pdf'
    rescue LoadError
      abort "ERROR: 'combine_pdf' gem not installed; please run `gem install combine_pdf` at first."
    end
    #
    nombre_opts = proc {
      require 'yaml'
      conffile = 'config-starter.yml'
      confdict = File.open(conffile, encoding: 'utf-8') {|f| YAML.load(f) }
      d = confdict['starter']
      mm2pt = 72.0 / 25.4    # 1 pt == 1/72 inch, 1 inch == 25.4 mm
      {
        :start     => d['nombre_startnumber'],
        :margin_h  => d['nombre_bottommargin'].to_f * mm2pt,
        :margin_w  => d['nombre_sidemargin'].to_f * mm2pt,
        :font      => nil,
        :size      => d['nombre_fontsize'].to_i,
        :color     => color2rgb[d['nombre_fontcolor']],
        :binding   => nil,
      }
    }.call()
    #
    class CombinePDF::PDF
      def add_nombre(options={})
        start    = options[:start]    || 1
        margin_h = options[:margin_h] || 5
        margin_w = options[:margin_w] || 2
        font     = options[:font]     || :Helvetica
        size     = options[:size]     || 6
        color    = options[:color]    || [0.5, 0.5, 0.5]  # gray
        binding  = options[:binding]  || :left
        digit_w, digit_h = CombinePDF::Fonts.dimensions_of("9", font, size)
        box_w = digit_w * 1.2
        box_h = digit_h * 1.3
        is_left = binding == :left
        params = {
          x: nil, y: nil, width: box_w, height: box_h,
          font: font, font_size: size, font_color: color,
        }
        self.pages.each.with_index(start) do |page, page_num|
          mediabox = page[:CropBox] || page[:MediaBox]  or
            abort "ERROR: failed to get page size of pdf"
          page_w = mediabox[2]
          page_h = mediabox[3]
          top    = page_h - margin_h
          bottom = margin_h
          left   = margin_w
          right  = page_w - margin_w - box_w
          params[:x] = is_left ? left : right
          params[:y] = bottom
          page_num.to_s.reverse.each_char do |c|
            page.textbox(c, params)
            params[:y] += box_h
          end
          is_left = ! is_left
        end
        self
      end
    end
    #
    if infile.nil?
      require 'yaml'
      config = File.open("config.yml", 'r', encoding: 'utf-8') {|f| YAML.load(f) }
      bookname = config['bookname']  or abort("ERROR: missing 'bookname' in config.yml")
      infile = bookname + ".pdf"
    end
    File.file?(infile)  or abort("ERROR: #{infile}: pdf file not found.")
    if outfile.nil?
      #outfile = infile.sub(/\.pdf$/, '_nombre.pdf')
      outfile = infile
    end
    #
    #pdf = CombinePDF.parse(File.binread(infile))
    #pdf.add_nombre()
    #File.binwrite(outfile, pdf.to_pdf())
    pdf = CombinePDF.load(infile)
    pdf.add_nombre(nombre_opts)
    pdf.save(outfile)
  end

end


##
## プレビュー用のサーバを起動する
##
namespace :web do

  invoke_web_task = proc do
    #sh "rake web"
    Process.fork { Rake::Task['web'].invoke() }
    Process.wait()
  end

  helper_message_when_start_server = <<END
*
* Please open http://localhost:#{WEBSERVER_PORT}/ in browser.
*
END

  helper_message_when_address_already_in_use = <<END
**
** ERROR: Failed to start web server.
**
** Other webserver process seems running. Kill it and restart webserver.
**
** How to:
**   $ ps | head -1; ps | grep web[:]server
**     PID TTY           TIME CMD
**   12345 ttys002    0.00.35 /usr/bin/ruby /usr/bin/rake web:server
**   $ kill -KILL 12345
**   $ rake web:server
**
END

  favicon_base64 = <<END
AAABAAEAEBACAAEAAQCwAAAAFgAAACgAAAAQAAAAIAAAAAEAAQAAAAAAgAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/
/wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//
AAD//wAA//8AAP//AAD//wAA
END

  desc "+ start web server for preview"
  task :server do
    rebuild_js = (ENV['STARTER_REBUILD_JS'] ||= '/rebuild.js')
    invoke_web_task.call()
    #
    require 'yaml'
    config = File.open('config.yml') {|f| YAML.load(f) }
    contdir = config['contentdir']
    #
    require 'webrick'
    root = 'webroot/'
    host = '0.0.0.0'   # don't use '127.0.0.1' to work on Docker
    port = ENV['WEBSERVER_PORT'] ? ENV['WEBSERVER_PORT'].to_i : WEBSERVER_PORT
    onstart = proc { puts helper_message_when_start_server }
    srvconf = {DocumentRoot: root, BindAddress: host, Port: port, StartCallback: onstart}
    begin
      srv = WEBrick::HTTPServer.new(srvconf)
    rescue Errno::EADDRINUSE => ex
      at_exit { $stderr.puts helper_message_when_address_already_in_use }
      raise
    end
    #
    srv.mount_proc('/favicon.ico') do |req, res|
      res.content_type     = "image/x-icon"
      res['Cache-Control'] = "public, max-age=#{60*60*24}"
      res.body = favicon_base64.unpack("m")[0]
    end
    #
    flag_quit = false
    interval  = 0.8  # seconds
    srv.mount_proc(rebuild_js) do |req, res|
      file = nil
      if req.query_string =~ /\Afile=([^&]*)/
        file = $1.strip
        file = nil if file.empty?
      end
      #
      errmsg = nil
      if file.nil?
        # pass
      elsif file !~ /\A[-\w]+\.re\z/
        errmsg = "invalid file"
      else
        file = File.join(contdir, file) if contdir
        errmsg = "file not found." if ! File.exist?(file)
      end
      #
      if errmsg
        body = "alert('ERROR: #{errmsg}');"
      else
        body = "window.location.reload();"
        ## sleep until '*.re' file modified
        if file
          mtime = File.mtime(file)
          sleep interval while !flag_quit && mtime == File.mtime(file)
        end
        ## generate html file from '*.re'
        invoke_web_task.call() unless flag_quit
      end
      res.content_type = "application/javascript"
      msg = "Server seems down. Press OK to reload."
      res.body = !flag_quit ? body : "alert('#{msg}');window.location.reload();"
    end
    #
    trap(:INT) { flag_quit = true; srv.shutdown() }
    srv.start()
  end

end


##
## 高解像度用の画像から低解像度の画像を生成するRakeタスク。
## 詳細は「ワンストップ！技術同人誌を書こう」第8章を参照のこと。
## https://booth.pm/ja/items/708196
##
desc "+ convert images (high resolution -> low resolution)"
task :images do
  ## macOSならsipsコマンドを使い、それ以外ではImageMagickを使う
  has_sips = File.exist?("/usr/bin/sips")
  if ! has_sips
    ok = system("convert --version >/dev/null")
    if ! ok
      abort "ERROR: 'convert' command not found; please install ImageMagick."
    end
  end
  ## 高解像度の画像をもとに低解像度の画像を作成する
  for src in Dir.glob("images_highres/**/*.{png,jpg,jpeg}")
    ## 低解像度の画像を作成済みなら残りの処理をスキップ
    dest = src.sub("images_highres/", "images_lowres/")
    next if File.exist?(dest) && File.mtime(src) == File.mtime(dest)
    ## 必要ならフォルダを作成
    dir = File.dirname(dest)
    mkdir_p dir if ! File.directory?(dir)
    ## 高解像度の画像のDPIを変更（72dpi→360dpi）
    if has_sips
      sh "sips -s dpiHeight 360 -s dpiWidth 360 #{src}"
    else
      sh "convert -density 360 -units PixelsPerInch #{src} #{src}"
    end
    ## 低解像度の画像を作成（72dpi、横幅1/5）
    if has_sips
      `sips -g pixelWidth #{src}` =~ /pixelWidth: (\d+)/
      option = "-s dpiHeight 72 -s dpiWidth 72 --resampleWidth #{$1.to_i / 5}"
      sh "sips #{option} --out #{dest} #{src}"
    else
      sh "convert -density 72 -units PixelsPerInch -resize 20% #{src} #{dest}"
    end
    ## 低解像度の画像のタイムスタンプを、高解像度の画像と同じにする
    ## （＝画像のタイムスタンプが違ったら、画像が更新されたと見なす）
    File.utime(File.atime(dest), File.mtime(src), dest)
  end
  ## 高解像度の画像が消されたら、低解像度の画像も消す
  for dest in Dir.glob("images_lowres/**/*").sort().reverse()
    src = dest.sub("images_lowres/", "images_highres/")
    rm_r dest if ! File.exist?(src)
  end
end


##
## 低解像度と高解像度を切り替えるRakeタスク。
## 詳細は「ワンストップ！技術同人誌を書こう」第8章を参照のこと。
## https://booth.pm/ja/items/708196
##
namespace "images" do

  desc "+ toggle image directories ('images_{lowres,highres}')"
  task :toggle do
    if ! File.symlink?("images")
      msg =  "ERROR: 'images' directory should be a symbolic link.\n"
      msg << "       rename it and create symbolic link, for example:\n"
      msg << "  $ mv images images_highres\n"
      msg << "  $ ln -s images_highres images\n"
      abort msg
    end
    link = File.readlink("images")
    rm "images"
    if link == "images_lowres"
      ln_s "images_highres", "images"
    else
      ln_s "images_lowres", "images"
    end
  end

end
