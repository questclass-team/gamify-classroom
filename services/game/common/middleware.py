from collections.abc import Callable

from django.http import HttpRequest, HttpResponse, JsonResponse


class ApiNotFoundMiddleware:
    """Return JSON for missing API routes instead of Django's HTML 404 page."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)

        if request.path.startswith("/api/") and response.status_code == 404:
            return JsonResponse({"detail": "Not found."}, status=404)

        return response
