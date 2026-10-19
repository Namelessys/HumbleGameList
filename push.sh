#!/bin/bash

if [ $# -eq 0 ]; then
	echo "No commit msg given"
	exit 1
else
	ARG="$1"
fi
	
case "$ARG" in
	*.txt|*.log)
		# Treat as a file path
		if [ ! -f "$ARG" ]; then
			echo "Commit message file not found: $ARG" >&2
			exit 1
		fi
		if [ ! -s "$ARG" ]; then
			echo "Commit message file is empty: $ARG" >&2
			exit 1
		fi
		git add -A
		if git commit -F "$ARG"; then
			git push
		else
			echo "Commit failed (nothing staged, or empty message?)" >&2
			exit 1
		fi
		;;
	*)
		# Treat as immediate text message
		git add -A
		if git commit -m "$ARG"; then
			git push
		else
			echo "Commit failed (nothing staged?)" >&2
			exit 1
		fi
		;;
esac
