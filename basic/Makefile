pdf: preproc
	sudo docker run --rm -v $(PWD):/work -w /work kauplan/review2.5 rake pdf

html: preproc
	sudo docker run --rm -v $(PWD):/work -w /work kauplan/review2.5 rake web

clean:
	sudo docker run --rm -v $(PWD):/work -w /work kauplan/review2.5 rake clean

preproc: extract-tags
	sh preproc.sh

extract-tags:
	 git extract-tags book/ ../../bluecore -s scripts

update:
	cd .. && sh update.sh

.PHONY: pdf clean preproc extract-tags


