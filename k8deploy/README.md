# Local Kubernetes (k8deploy)

These manifests are for local clusters (minikube, kind, Docker Desktop).

Apply all:
```sh
kubectl apply -f k8deploy
```

Then add to your hosts file (or use local DNS):
```
127.0.0.1 your-domain.local
```

If you use an ingress controller, enable it in your local cluster and update
the ingress host in `k8deploy/ingress.yaml`.

Images expected by the manifests (build locally or push to your registry):
- `trendtrove-app:local`
- `trendtrove-auth:local`
- `trendtrove-product:local`
- `trendtrove-cart:local`
- `trendtrove-mail:local`
