all: pdf html

pdf: preproc
	sudo docker run --rm -v $(PWD):/work -w /work kauplan/review2.5 rake pdf

html: preproc
	sudo docker run --rm -v $(PWD):/work -w /work kauplan/review2.5 rake web

clean:
	sudo docker run --rm -v $(PWD):/work -w /work kauplan/review2.5 rake clean

md:
	sudo docker run --rm -v $(PWD):/work -w /work kauplan/review2.5 rake markdown

preproc: extract-tags
	sh preproc.sh

extract-tags:
	 git extract-tags book/ ./bluecore -s scripts

update:
	rm -rf ./bluecore
	git clone https://github.com/nananapo/bluecore

.PHONY: pdf clean preproc extract-tags


