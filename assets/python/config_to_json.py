from configparser import ConfigParser
from sys import stdout, stdin
from json import dump


def stringify(cfg: ConfigParser):
    sections = dict((key, dict(values.items())) for key, values in cfg.items())
    dump(sections, stdout)


if __name__ == "__main__":
    cfg = ConfigParser()
    cfg.read_file(stdin)
    stringify(cfg)
