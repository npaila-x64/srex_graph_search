import srex
import operator
import nltk

#Download stopword
if(1):
    nltk.download('stopwords') 
    nltk.download('punkt') # Tokenizers
    nltk.download('wordnet') # Wordnet
# Stemmer
st = srex.PorterStemmer()
# Stop Words
stop_words_list = srex.stopwords.words('english') #a small one
newStopWords = srex.get_stop_words('en') # a big one
stop_words_list.extend(newStopWords) # all together

query                  = 'internet of things iot'
reference_term         = 'iot'
nr_search_results      = 10
ranking_weight_type    = 'none' # it can be: 'none', 'linear' or 'inverse'
limit_distance         = 4 
sumarize               = 'none' 
include_reference_term = False
nr_of_graph_terms      = 15
# Ranking de documentos de IEEE Explore CON ponderación de documentos
results = srex.get_ieee_explore_ranking(query, nr_search_results)

doc_weighted = srex.get_ranking_as_string(results, ranking_weight_type)
paragraphs_list = doc_weighted.split('.')
processed_paragraphs_list = list(map(lambda x: srex.text_transformations(x, stop_words_list, lema=True, stem=False), paragraphs_list))
doc_pos_matrix = srex.get_documents_positions_matrix(processed_paragraphs_list)
vecinity_matrix = srex.get_vecinity_matrix(doc_pos_matrix, reference_term, limit_distance, sumarize, include_reference_term)
unique_vecinity_dict = srex.get_unique_vecinity_dict(vecinity_matrix)
terms_freq_dict = {k: len(v) for k, v in unique_vecinity_dict.items()}
sorted_terms_freq_dict = sorted(terms_freq_dict.items(), key=operator.itemgetter(1), reverse=True)
first_sorted_terms_freq_dict = {k: v for k, v in list(sorted_terms_freq_dict)[:nr_of_graph_terms]}
most_freq_distance_dict = {k: {'frequency':terms_freq_dict[k], 'distance':srex.np.median(unique_vecinity_dict[k])} for k in first_sorted_terms_freq_dict.keys()}

import pprint
pprint.pprint(terms_freq_dict)