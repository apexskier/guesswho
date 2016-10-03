declare interface UserInfo {
    name: string;
    id: string;
    picture?: {
        data: {
            is_silhouette: boolean;
            url: string;
        };
    };
}

interface Array<T> {
    find(predicate: (search: T) => boolean): T;
}
