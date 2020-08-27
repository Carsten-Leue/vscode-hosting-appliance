from configparser import ConfigParser
from json import load
from sys import stdin, stdout
from typing import Mapping


def stringify(sections: Mapping):
    cfg = ConfigParser()
    cfg.read_dict(sections)
    cfg.write(stdout)


if __name__ == "__main__":
    stringify(load(stdin))
