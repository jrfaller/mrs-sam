print(__doc__)

import numpy as np
import pandas 

from sklearn.cluster import DBSCAN
from sklearn import metrics
from sklearn.datasets.samples_generator import make_blobs
from sklearn.preprocessing import StandardScaler


X = pandas.read_csv("./metrics_data.csv", header=None)
X = StandardScaler().fit_transform(X)
db = DBSCAN(eps=0.01, min_samples=5).fit(X)

core_samples_mask = np.zeros_like(db.labels_, dtype=bool)
core_samples_mask[db.core_sample_indices_] = True
labels = db.labels_

print('Labels %s' %db.labels_)

# Number of clusters in labels, ignoring noise if present.
n_clusters_ = len(set(labels)) - (1 if -1 in labels else 0)

print('Estimated number of clusters: %d' % n_clusters_)
print("Silhouette Coefficient: %0.3f" % metrics.silhouette_score(X, labels))

######
# create dir
######
import os
import shutil
oids = pandas.read_csv("./metrics_ids.csv", header=None)
i = 0
for label in labels:
	mypath = './%d' %label
	if not os.path.isdir(mypath):
		os.makedirs(mypath)
	source = './img/%s.png' %oids.iloc[0,i]
	print('source:%s' %source)
	target = '%s/%s.png' % (mypath,oids.iloc[0,i])
	print('target:%s' %target)
	shutil.copyfile(source, target)
	i = i + 1

######
# plot
######

import matplotlib.pyplot as plt

# Black removed and is used for noise instead.
unique_labels = set(labels)
colors = [plt.cm.Spectral(each)
          for each in np.linspace(0, 1, len(unique_labels))]
for k, col in zip(unique_labels, colors):
    if k == -1:
        # Black used for noise.
        col = [0, 0, 0, 1]

    class_member_mask = (labels == k)

    xy = X[class_member_mask & core_samples_mask]
    plt.plot(xy[:, 0], xy[:, 1], 'o', markerfacecolor=tuple(col),
             markeredgecolor='k', markersize=14)

    xy = X[class_member_mask & ~core_samples_mask]
    plt.plot(xy[:, 0], xy[:, 1], 'o', markerfacecolor=tuple(col),
             markeredgecolor='k', markersize=6)

plt.title('Estimated number of clusters: %d' % n_clusters_)
# plt.show()

from matplotlib.backends.backend_pdf import PdfPages
pp = PdfPages('out.pdf')
plt.savefig(pp, format='pdf')
pp.close()