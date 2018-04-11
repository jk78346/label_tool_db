import os
import json
import time
import random
import pickle
import argparse
from collections import Counter

import networkx as nx
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.escape

from tornado.options import define, options
from tornado.httputil import parse_body_arguments

import tokenizer
import agreement_score

define("port", default=9001, help="run on the given port", type=int)
define("dataset", default='', help="dataset")

class IndexHandler(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_status(200)
        self.set_header('Content-type', 'text/html; charset=utf-8')
        self.set_header('Access-Control-Allow-Origin', 'http://wm.csie.org')

    def post(self):

        arguments = {}
        files = {}
        parse_body_arguments('application/x-www-form-urlencoded', self.request.body, arguments, files)

        if 'keywords' in arguments: # agreement analysis
            keywords = tornado.escape.to_unicode(arguments['keywords'][0])

            print(keywords)

            agreement_str = agreement_score.agreement_score(keywords)
            self.write(agreement_str.encode('utf-8'))

        else:
            article = tornado.escape.to_unicode(arguments['article'][0])
            
            word_counter = Counter([t[0] for t in tokenizer.tokenize(article)])
            freq_words = ['{} {}'.format(t[0], t[1]) for t in word_counter.most_common() if t[0] not in stop_words]

            self.write('<br/>'.join(freq_words).encode('utf-8'))
        
        self.finish()

class DemoHandler(tornado.web.RequestHandler):

    def generate_graph_from_adj_list(self, adj_list, subject_word, labels, degree):

        G = nx.Graph()
        adj_words = set(adj_list[subject_word])
        ori_subject_word = subject_word
        subject_label = subject_word.split('_')[-1]
        subject_word = subject_word.split('_')[0]
        G.add_node(subject_word, _label=subject_label, 
                                 label=subject_word, 
                                 group=subject_label, 
                                 color=label2color[subject_label], 
                                fontcolor='white', 
                                isSubject=True)

        num_sample = 94879487
        if degree != '1':
            adj_words = list(adj_words)
            random.seed(time.time())
            random.shuffle(adj_words)
            num_sample = int(degree)
            adj_words = adj_words[:num_sample]
            adj_words = set(adj_words)

        for adj_word in adj_words:
            ori_adj_word = adj_word
            adj_label = adj_word.split('_')[-1]
            adj_word = adj_word.split('_')[0]

            if adj_label in labels:
                G.add_node(adj_word, _label=adj_label, 
                                     label=adj_word, 
                                     group=adj_label, 
                                     color=label2color[adj_label], 
                                     fontcolor='white', 
                                     isSubject=False)
                G.add_edge(subject_word, adj_word)


                if degree != '1':
                    # second degree

                    adj_adj_words = adj_list[ori_adj_word]
                    for adj_adj_word in adj_adj_words:

                        # this second-degree word is already linked to subject word
                        if adj_adj_word in adj_words:
                            adj_adj_label = adj_adj_word.split('_')[-1]
                            adj_adj_word = adj_adj_word.split('_')[0]

                            if adj_adj_label in labels:
                                G.add_edge(adj_word, adj_adj_word)
        
        print('return graph of {} nodes and {} edges.'.format(G.number_of_nodes(), G.number_of_edges()))

        return G

    def set_default_headers(self):
        self.set_status(200)
        self.set_header('Content-type', 'text/html; charset=utf-8')
        self.set_header('Access-Control-Allow-Origin', 'http://ejhsu.twbbs.org')

    def get(self, subject, labels, degree):
        labels = labels.split('_')
        graph = self.generate_graph_from_adj_list(adj_list, subject, set(labels), degree)
        nx.drawing.nx_pydot.write_dot(graph, 'tmp.dot')

        with open('tmp.dot') as f:
            dotstring = f.read().replace('\n', '\\\n').replace('\'', '\"').replace('\\\nedge', '\\\n"edge"')

        print(dotstring)

        _label2color = {label: label2color[label] for label in labels}

        self.render("demo.html", subject=subject, dotstring=dotstring, labels=_label2color, word_in_docs=word_in_documents)

class ArticleHandler(tornado.web.RequestHandler):
    def set_default_headers(self):
        self.set_status(200)
        self.set_header('Content-type', 'text/html; charset=utf-8')
        self.set_header('Access-Control-Allow-Origin', 'http://ejhsu.twbbs.org')

    def get(self, filename):

        if options.port >= 9005:
            self.write(open(os.path.join('/home/ejhsu/Desktop/material_all/unlabeled', filename)).read().replace('\n', '<br />'))
        else:
            self.write(open(os.path.join('/home/ejhsu/Desktop/home_all/unlabeled', filename)).read().replace('\n', '<br />'))

if __name__ == "__main__":
    tornado.options.parse_command_line()

    print('running {} dataset on {} port'.format(options.dataset, options.port))

    with open('most_freq_100.txt') as f:
        stop_words = [ w for w in f.read().split('\n') if w ]

    with open('/home/ejhsu/IE/keyword-extraction/src/{}_adjlist.pkl'.format(options.dataset), 'rb') as f:
        adj_list = pickle.load(f)
        print('adj list loaded')
    with open('/home/ejhsu/IE/keyword-extraction/src/{}_word_in_documents.pkl'.format(options.dataset), 'rb') as f:
        word_in_documents = pickle.load(f)
        print('word in documents dict loaded: {}'.format(type(word_in_documents)))
    with open('/home/ejhsu/IE/git/data/labels_0317.txt', encoding='utf-8-sig') as f:
        rows = [row.split(',') for row in f.read().split()]
        label2color = {row[0]: row[1] for row in rows}

    tornado.options.parse_command_line()
    app = tornado.web.Application(handlers=[(r"/demo/(.*)/(.*)/(.*)", DemoHandler), (r"/article/(.*)", ArticleHandler), (r"/", IndexHandler)])
    http_server = tornado.httpserver.HTTPServer(app)
    http_server.bind(options.port)
    http_server.start(0)
    tornado.ioloop.IOLoop.instance().start()