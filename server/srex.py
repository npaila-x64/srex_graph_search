import numpy as np

import math

from collections import defaultdict

from nltk.corpus import stopwords

from many_stop_words import get_stop_words

from nltk.stem import PorterStemmer #Stemmer
from textblob import Word #Lemmatize

from graphviz import Graph

import nltk

from functools import reduce


from xploreapi import XPLORE

from sklearn.feature_extraction.text import CountVectorizer


xploreID = '6g7w4kfgteeqvy2jur3ak9mn'
query = XPLORE(xploreID)
query.outputDataFormat='object'


def get_word_distances(word1_vector_pos: list, word2_vector_pos: list) -> list:
    """
    Calculate de absolute distance between the positions of two 
    words in a document. word1_vector_pos and word2_vector_pos, 
    represents the vectors with the word positions in the document. 
    Using lambda functions.

    Parameters
    ----------
    word1_vector_pos : list
        List with the positions of the first word
    word2_vector_pos : list
        List with the positions of the second word
    
    Returns
    -------
    result : list
        List with the absolute distances between the positions of the words
    """
    
    # this empty list stores the output
    result = []
    
    # now, apply nested map function on both 
    # the created lists append the final output to
    # the "result" list
    list(map(lambda a: result.extend(map(a, word2_vector_pos)), map(lambda a: lambda b: abs(a-b), word1_vector_pos)))
    return result


def get_ieee_explore_article(parameter: str, value: str) -> str:
    """
    Get an article from IEEE-Xplore.
    
    Parameters
    ----------
    parameter
        Parameter used to search the article (e.g. 'article_number')
    value
        Value of the parameter used to search the article (e.g. '8600704')
    
    Returns
    -------
    article : str
        A string with the title and abstract of an article
    """
    query = XPLORE(xploreID)
    query.outputDataFormat='object'
    query.addParameter(parameter, value)
    data = query.callAPI()
    return data['articles'][0]['title'] + '. ' + data['articles'][0]['abstract']


def get_ieee_explore_ranking(
        query_text: str, 
        max_results: int
        ) -> list:
    """
    Get a ranking of articles from IEEE-Xplore.

    Parameters
    ----------
    query_text : str
        Text used to search the articles
    max_results : int
        Maximum number of results to be returned

    Returns
    -------
    results : list
        A list of articles
    """
    query = XPLORE(xploreID)
    query.outputDataFormat='object'
    query.maximumResults(max_results)
    query.queryText(query_text)
    data = query.callAPI()
    results = data['articles']
    
    return results

# Comment from P.Galeas:
# This is a preliminary approach to assign some relevance to the documents in the ranking
# The first documents should be more relevant than the last documents in the ranking.
# This approach must be improved.
def get_ranking_as_string(
        results: list, 
        weighted: str = 'none'
        ) -> str:
    """
    Transform the ranking array in one string document.
    if weighted <> none : the document will be weighted depending on its position in the ranking,
    by multiplying its text (title + abstract) with the corresponding factor.

    Parameters
    ----------
    results : list
        Array of documents
    
    Returns
    -------
    ranking : str
        A string with the ranking
    """
    ranking = ''
    results_size = len(results)
    for index, article in enumerate(results):
        if (weighted=='linear'):
            factor = results_size - index
            ranking = ranking + ' ' + (article['title'] + '. ' + article['abstract'] + ' ') * factor
        elif (weighted=='inverse'):
            factor = math.ceil(results_size/(index+1))
            ranking = ranking + ' ' + (article['title'] + '. ' + article['abstract'] + ' ') * factor
        else:
            ranking = ranking + ' ' + article['title'] + '. ' + article['abstract']
    return ranking


def get_ranking_as_list(results, atribute_list):
    results_size = len(results)
    ranking_list = []
    for index, article in enumerate(results):
        ranking_string = ''
        for atribute in atribute_list:
            ranking_string = ranking_string + ' ' + article[atribute]
        ranking_list.append(ranking_string)
    return ranking_list



def text_transformations(
        paragraph: str, 
        stop_words_list: list, 
        lema: bool = True, 
        stem: bool = True
        ) -> str:
    """
    Apply some text transformations to a paragraph.

    Parameters
    ----------
    paragraph : str
        String with the paragraph to be transformed
    stop_words_list : list
        List of stop words to be removed from the paragraph
    lema : bool
        If True, lematization is applied
    stem : bool
        If True, stemming is applied
    
    Returns
    -------
    final_string : str
        The transformed paragraph
    """
    
    # Low the string
    paragraph = paragraph.lower()
    
    # Remove puntuation
    tokens = nltk.word_tokenize(paragraph)
    filtered_parragraph = [w for w in tokens if w.isalnum()]
    
    # Remove Stopwords
    if(len(stop_words_list)>0):
        filtered_parragraph = list(filter(lambda word_of_parragraph: (word_of_parragraph not in stop_words_list), filtered_parragraph))
    
    # Apply lematization
    if(lema):
        filtered_parragraph = list(map(lambda word_filtered_parragraph: Word(word_filtered_parragraph).lemmatize(), filtered_parragraph))
    
    # Stemmer
    if(stem):
        filtered_parragraph = list(map(lambda word: st.stem(word), filtered_parragraph))
    
    final_string = ' ' . join(map(str, filtered_parragraph))
    
    return final_string



def get_documents_positions_matrix(documents: list) -> list:
    """
    Calculate a matrix containing the terms positions from a group (list) of documents.

    Parameters
    ----------
    documents : list
        List of documents

    Returns
    -------
    term_positions_matrix : list
        A list of dictionaries, each dictionary contains the terms positions of a document
    """
    term_positions_matrix = []
    for doc in documents:
        positions_dict = get_term_positions_dict(doc)
        term_positions_matrix.append(positions_dict)
    return term_positions_matrix


def get_vecinity_matrix(
        document_positions_matrix: dict, 
        reference_term: str, 
        limit_distance: int, 
        summarize: str, 
        include_reference_term: bool
        ) -> list:
    """
    Calculate a vecinity matrix from a list of documents.

    Parameters
    ----------
    document_positions_matrix : dict
        List of dictionaries, each dictionary contains the terms positions of a document
    reference_term : str
        Term used as reference for calculating wich terms are in its vecinity
    limit_distance : int
        Maximal distance of terms used to calculate the vecinity
    summarize : str
        Used to define the function to sumarize the distance of the terms in the vecinity
    include_reference_term : bool
        If True, the reference term is included in the vecinity
    
    Returns
    -------
    vecinity_matrix : list
        A list of dictionaries, each dictionary contains the terms in the vecinity of the reference term and their corresponding distances
    """
    vecinity_matrix = []
    for doc_positions_dic in document_positions_matrix:
        document_term_vecinity_dict = get_document_term_vecinity_dict(doc_positions_dic, reference_term, limit_distance, summarize, include_reference_term)
        vecinity_matrix.append(document_term_vecinity_dict)
    return vecinity_matrix


def get_document_term_vecinity_dict(
        document_positions_dict: dict, 
        reference_term: str, 
        limit_distance: int, 
        summarize: str = 'none', 
        include_reference_term: bool = True
        ) -> dict:
    """
    Calculate the vecinity of a term in a document.
    
    Parameters
    ----------
    document_positions_dict
        Dictionary with the positions of all terms in a document
    reference_term
        Term used as reference for calculating which terms are in its vecinity
    limit_distance
        Maximal distance of terms used to calculate the vecinity
    sumarize
        Used to define the function to sumarize the distance of the terms in the vecinity
    include_reference_term : bool
        If True, the reference term is included in the vecinity
    
    Returns
    -------
    vecinity_dict : dict
        A dictionary with the terms in the vecinity of the reference term and their corresponding distances
    """

    # Create the empty dictionary
    vecinity_dict = {}
    
    # Get the term positions of the reference term
    reference_term_positions = document_positions_dict[reference_term]
    
    # Calculate all terms in document_positions_dict that are at distance limit_distance (or closer) to the reference_term
    # and return a list of these terms and their corresponding distances
    for term, term_positions in document_positions_dict.items():
        
        if((term != reference_term) or (include_reference_term)): # Evita que se compare el termino de referencia consigo mismo
            
            # Calculate the distance between the reference term and the rest of terms
            neighborhood_positions = calculate_term_positions_distances(reference_term_positions, term_positions, limit_distance)
            
            if(len(neighborhood_positions)>0):
                if (summarize == 'mean'):
                    vecinity_dict[term] = np.mean(neighborhood_positions)
                elif (summarize == 'median'): 
                    vecinity_dict[term] = np.median(neighborhood_positions)
                else: 
                    vecinity_dict[term] = neighborhood_positions

    return vecinity_dict



# Calculate the a dictionary with the document's term positions
# See corresponding UNITTEST
def get_term_positions_dict(document):
    """Calculate the a dictionary with the document's term positions."""
    vectorizer = CountVectorizer()
    vector = vectorizer.build_tokenizer()(document)
    document_positions_dic = defaultdict(list)
    for i in range(len(vector)):
        document_positions_dic[vector[i]].append(i)
    return document_positions_dic


# Merge two "generic" dictionaries 
# See corresponding UNITTEST
def merge_dictionaries(dict_A: dict, dict_B: dict):
    """Merge two "generic" dictionaries."""
    for i in dict_A.keys():
        if(i in dict_B.keys()):
            dict_B[i] = dict_B[i]+dict_A[i]
        else:
            dict_B[i] = dict_A[i]
    return dict_B


# Merge two "graph" dictionaries 
# See corresponding UNITTEST
def merge_graph_dictionaries(g1, g2):
    """Merge two "graph" dictionaries."""
    for i in g1.keys():
        if (i in g2.keys()):
            g2[i]['frequency'] = g2[i]['frequency'] + g1[i]['frequency']
            g2[i]['distances'] = g2[i]['distances'] + g1[i]['distances']
        else:
            g2[i] = {'frequency': g1[i]['frequency'], 'distances': g1[i]['distances']} 
    return g2


def calculate_term_positions_distances(
        term_positions1: list, 
        term_positions2: list, 
        limit_distance: float = float("inf")
        ) -> list:
    """
    Compare the positions vectors of two terms, and return the list of 
    distances of the terms that are inside limit_distance.

    Parameters
    ----------
    term_positions1 : list
        List of positions of the first term
    term_positions2 : list
        List of positions of the second term
    limit_distance : float
        Maximal distance of terms

    Returns
    -------
    term_distances : list
        List of distances of the terms that are inside limit_distance 
    """
    term_distances = [] 
    for pos1 in term_positions1:
        for pos2 in term_positions2:
            absolute_distance = abs(pos1-pos2)
            if (absolute_distance <= limit_distance):
                term_distances.append(absolute_distance)
    return term_distances


            
def get_unique_vecinity_dict(document_positions_matrix):
    """Calculates a vecinity dictionary from all documents, merging their vecinities."""
    product = reduce((lambda x, y: merge_dictionaries(x,y)), document_positions_matrix)
    return product


def get_unique_graph_dictionary(graph_dictionaries_array):
    """Calculates a vecinity dictionary from an array of graph dictionaries, merging their vecinities."""
    product = reduce((lambda x, y: merge_graph_dictionaries(x,y)), graph_dictionaries_array)
    return product


def normalize_dictionary_values(
        dictio: dict, 
        range: list
        ) -> dict:
    """
    Normalize the values of a dictionary using a range.
    The range should be (lower_bound, upper_bound).
    
    Parameters
    ----------
    dictio : dict
        Dictionary to be normalized
    range : list
        Tuple with the lower and upper bounds of the range used to normalize the dictionary
    
    Returns
    -------
    dictio : dict
        The normalized dictionary
    """
    a = dictio[max(dictio, key=dictio.get)]
    c = dictio[min(dictio, key=dictio.get)]
    b = range[1]
    d = range[0]
    
    if((a - c)>0):
        m = (b - d) / (a - c)
    else:
        m = (b - d) # term frequency dictionary have only sigle words (frequency=1)
        
    dictio.update((k, (m*(dictio[k]-c)+d)) for k in dictio.keys())
    #dictio.update((k, (m*(dictio[k]-c)+d)) for k in dictio.keys())
    return dictio
    
    
def getGraphViz(
        search_key: str, 
        neighboors_df: dict, 
        node_size: str = '2', 
        node_color: str = 'green'
        ) -> Graph:
    """Calculates the graph of the most frequently neighboors of a term."""
    g = Graph('G', filename='graph_search.gv', engine='neato')
    g.attr('node', shape='circle', fontsize='10')
    counter = 0
    g.node('0', label=search_key, root='true', fixedsize='true', width=node_size, style='filled', fillcolor='azure3', fontcolor='black')
    for keyword, dic in neighboors_df.items() :
        counter = counter + 1
        p_with = str(dic['frequency'])
        g.node("'" +str(counter)+"'", keyword, fixedsize='true', width=node_size, penwidth=p_with, color=node_color)
        g.edge('0', "'" +str(counter)+"'", label=str(dic['distance']), len=str(dic['distance']))
        
    return g
